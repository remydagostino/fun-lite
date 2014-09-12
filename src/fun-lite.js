function _baseInnerLift(inner, fn, args) {
  var argI, args, unwrapper;

  // Special case for futures
  if (args.length > 1 && args[0] instanceof _Future) {
    return _Future._innerLift(inner, fn, args);
  }

  // This other case handles everything else, though
  // each monad could have it's own implementations...

  unwrapper = function(xs) {
    return (inner ? flatMap : map)(
      function(x) {
        return fn.apply(this, xs.concat(x));
      },
      args[args.length - 1]
    );
  };

  for(argI = args.length - 2; argI >= 0; --argI) {
    unwrapper = function(memo, arg, xs) {
      return flatMap(
        function(x) {
          return memo(xs.concat(x));
        },
        arg
      );
    }.bind(this, unwrapper, args[argI]);
  }

  return unwrapper([]);
}

function lift(fn) {
  return function() {
    return _baseInnerLift(false, fn, arguments);
  };
}

function liftM(fn) {
  return function() {
    return _baseInnerLift(true, fn, arguments)
  };
}


// :: a -> Boolean
function isArguments(a) {
  return Object.prototype.toString.call(a) === '[object Arguments]';
}

// :: a -> Boolean
function isArray(a) {
  return Array.isArray(a);
}

// :: a -> String -> Boolean
function has(key, obj) {
  return obj != null && typeof obj[key] !== 'undefined';
}

function hasMethod(key, obj) {
  return has(key, obj) && typeof obj[key] === 'function';
}


// :: (a -> b) -> [a] -> [b]
function arrayMap(fn, xs) {
  return xs.map(function(x) {
    return fn(x);
  });
}

// :: [[a]] -> [a]
function arrayFlatten(xs) {
  return xs.reduce(function(m, x) {
    return m.concat(x);
  }, []);
}

// :: Arguments a => (c -> b -> c) -> c -> a -> c
function foldArguments(fn, init, args) {
  var argI, arg, result;

  result = init;

  for(argI = 0; arg < args.length; ++argI) {
    result = fn(result, arguments[argI]);
  }

  return result;
}


// :: (b -> a -> b) -> b -> [a] -> c
function foldArray(fn, init, xs) {
  return xs.reduce(function(m, x) {
    return fn(m, x);
  }, init);
}

// :: (b -> c) -> ... -> (a -> b) -> (a -> c)
function compose() {
  var args = arguments;
  var start = args.length - 1;
  return function() {
    var i = start;
    var result = args[start].apply(this, arguments);
    while (i--) result = args[i].call(this, result);
    return result;
  };
}

// Returns a wrapped function called with new
// :: (-> a) -> (-> a)
function construct(fn) {
  return function() {
    return new (fn.bind.apply(fn, [null].concat(Array.prototype.slice.call(arguments))));
  }
}

// :: Semigroup s => s a -> s a -> s a
function concat(a, b) {
  if (hasMethod('concat', a)) {
    return a.concat(b);
  }
  else if (typeof a == 'string' && typeof b == 'string') {
    return a + b;
  }
}

// :: ((a -> c) -> (b -> c)) -> m a b -> c
function liftBi(err, success) {
  return function bimapper(a) {
    // Handle null or undefined
    if (a == null) {
      return err();
    }
    else if (hasMethod('bimap', a)) {
      return a.bimap(err, success);
    }
  };
}

// :: Monad m => (a -> [b]) -> [a] -> [b]
function flatMap(fn, xs) {
  if (hasMethod('flatMap', xs)) {
    return xs.flatMap(fn);
  }
  else if (Array.isArray(xs)) {
    return arrayFlatten(arrayMap(fn, xs));
  }
  // TODO: Flatmap for functions (hint: ((* 10) >>= (+)) 3 == 33 )
  // TODO: Flatmap for objects
  // fantasy land
  else if (hasMethod('chain', xs)) {
    return xs.chain(fn);
  }
}

// :: Foldable f => (b -> a -> b) -> b -> f a -> b
function fold(fn, init, xs) {
  if (isArguments(xs)) {
    return foldArguments(fn, init, xs);
  }
  else if (isArray(xs)) {
    return foldArray(fn, init, xs);
  }
  // TODO: Foldable for objects
  // TODO: Foldable for dom
  // TODO: Foldable for jQuery
}

// :: Functor f => (a -> b) -> f a -> f b
function map(fn, xs) {
  // TODO: Detect for null/undefined
  if (hasMethod('fmap', xs)) {
    return xs.fmap(fn);
  }
  else if (Array.isArray(xs)) {
    return arrayMap(fn, xs);
  }
  // TODO: Detect for strings
  // TODO: Detect for functions
  // TODO: Detect for A+ promises
  // TODO: Detect for arguments
  // TODO: Detect jquery objects
  // .. fallback
  else if (hasMethod('map', xs)) {
    return xs.map(function(x) { return fn(x); });
  }
  // TODO: Detect for plain objects
  // TODO: Detect for primatives
}

// Data types

// 1. Maybe
function _Maybe(isJust, value) {
  this.isNothing = !isJust;
  this.isJust    = isJust;
  this.value     = value;
}

_Maybe.prototype.bimap = function(onNull, onVal) {
  if (this.isJust) {
    return onVal(this.value);
  }
  else {
    return onNull();
  }
};

_Maybe.prototype.flatMap = _Maybe.prototype.chain = function(fn) {
  return this.bimap(nothing, fn);
};

_Maybe.prototype.fmap = _Maybe.prototype.map = function(fn) {
  return this.chain(function(x) {
    return just(fn(x));
  })
};

function just(x) {
  return new _Maybe(true, x);
}

function nothing() {
  return new _Maybe(false, null);
}

_Maybe.of = just;


// 2. Either
function _Either(isRight, left, right) {
  this.isRight = isRight;
  this.isLeft  = !isRight;
  this.right   = right;
  this.left    = left;
}

_Either.prototype.bimap = function(onLeft, onRight) {
  if (this.right) {
    return onRight(this.right);
  }
  else {
    return onLeft(this.left);
  }
};

_Either.prototype.flatMap = _Either.prototype.chain = function(fn) {
  if (this.right) {
    return fn(this.right);
  }
  else {
    return this;
  }
};

_Either.prototype.fmap = _Either.prototype.map = function(fn) {
  return this.chain(function(x) {
    return right(fn(x));
  });
};

function left(x) {
  return new _Either(false, x, null);
}

function right(x) {
  return new _Either(true, null, x);
}

_Either.of = right;


// 3. Validation
function _Validation(isSuccess, err, value) {
  this.isSuccess = isSuccess;
  this.isFail    = !isSuccess;
  this.err       = err;
  this.value     = value;
}

_Validation.prototype.bimap = function(onError, onSuccess) {
  if (this.isSuccess) {
    return onSuccess(this.success);
  }
  else {
    return onError(this.err);
  }
};

_Validation.prototype.flatMap = _Validation.prototype.chain = function(fn) {
  var v2 = fn(this.value);

  if (this.isSuccess) {
    return v2;
  }
  else if (v2.isSuccess) {
    return this;
  }
  else {
    return failure(concat(this.err, v2.err));
  }
};

_Validation.prototype.fmap = _Validation.prototype.map = function(fn) {
  if (this.isSuccess) {
    return success(fn(this.value));
  }
  else {
    return this;
  }
};

function success(x) {
  return new _Validation(true, null, x);
}

function failure(err) {
  return new _Validation(false, err, null);
}


// 4. Futures
// Most future operations can succeed or fail.
// Handle these by returning an either from the success function
function _Future(f) {
  this._fork = f;
}

function future(f) {
  return new _Future(f);
}

function resolved(value) {
  return new _Future(function(resolve) {
    return resolve(value);
  });
}

_Future.prototype.fork = function(done) {
  // TODO: Memoize so that the future can only be run once
  return this._fork(done);
};

_Future.prototype.flatMap = _Future.prototype.chain = function(fn) {
  return new _Future(function(resolve) {
    return this.fork(function(result) {
      return fn(result).fork(resolve);
    });
  }.bind(this));
};

_Future.prototype.fmap = _Future.prototype.map = function(fn) {
  return this.chain(function(result) {
    return resolved(fn(result));
  });
};

_Future.of = resolved;

_Future._innerLift = function(inner, fn, args) {
  var argx = args.length;

  return future(function(done) {
    var argc  = 0,
        argxs = [],
        i;

    for (i = 0; i < argx; i++) {
      args[i].fork(function(i, a) {
        var result;

        argxs[i] = a;
        argc    += 1;

        if (argc === argx) {
          result = fn.apply(this, argxs);

          if (inner) {
            result.fork(done);
          }
          else {
            done(result);
          }
        }
      }.bind(this, i));
    }
  });
};

