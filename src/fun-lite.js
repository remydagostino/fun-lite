(function(root, factory) {
  function optionalRequire(moduleName) {
    try {
      return require(moduleName);
    }
    catch (ex) {
      return undefined;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(optionalRequire('jquery'));
  }
  else {
    root.fun = factory(root.jQuery);
  }
})(this, function(jQuery) {

  // This is the base lift function.
  // It is called with:
  //   Boolean   - Indicating whether to unwrap
  //               the innermost call.
  //   Function  - The function being lifted
  //   Arguments - The args the function is called. If
  //               there are multiple then the first
  //               is used to pattern match a more specific
  //               lift function for that ADT
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

  // Functor/Applicative Lift
  // :: Functor f => (a -> .. -> b) -> (f a -> .. -> f b)
  function lift(fn) {
    return function() {
      return _baseInnerLift(false, fn, arguments);
    };
  }

  // Monadic lift
  // :: Monad m => (a -> .. -> b) -> (m a -> .. -> m b)
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

  // :: a -> Boolean
  function isNullOrUndefined(a) {
    return typeof a === 'undefined' || a === null;
  }

  // :: a -> Boolean
  function isJquery(a) {
    if (isNullOrUndefined(jQuery)) {
      return false;
    }
    else {
      return (a instanceof jQuery);
    }
  }

  // :: a -> String -> Boolean
  function has(key, obj) {
    return obj != null && typeof obj[key] !== 'undefined';
  }

  // :: String -> Object -> Boolean
  function hasMethod(key, obj) {
    return has(key, obj) && typeof obj[key] === 'function';
  }

  // Returns a wrapped function called with new
  // :: (-> a) -> (-> a)
  function construct(fn) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      return new (fn.bind.apply(fn, [null].concat(args)));
    }
  }

  // A convenience for lifting a constructor over monads
  function liftC(cf) {
    return lift(construct(cf));
  }


  //
  //////    Arrays           ////////////////////////////////
  //


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


  //
  //////    Arguments        ////////////////////////////////
  //

  // :: Arguments a => (c -> b -> c) -> c -> a -> c
  function foldArguments(fn, init, args) {
    var argI, result;

    result = init;

    for(argI = 0; argI < args.length; ++argI) {
      result = fn(result, args[argI]);
    }

    return result;
  }

  // :: Arguments a => (a ->)
  function mapArguments(fn, args) {
    return foldArguments(function(m, x) {
      return concat(m, fn(x))
    }, [], args);
  }

  // :: (b -> a -> b) -> b -> [a] -> c
  function foldArray(fn, init, xs) {
    return xs.reduce(function(m, x) {
      return fn(m, x);
    }, init);
  }


  //
  //////    Promises         ////////////////////////////////
  //

  // :: Promise p => (a -> p b) -> p a -> p b
  function flatMapPromise(fn, p) {
    return p.then(function(a) {
      return fn(a);
    });
  }

  // Mapping and flatmap are identical for promises
  // :: Promise p => (a -> b) -> p a -> p b
  function mapPromise(fn, p) {
    return flatMapPromise(fn, p);
  }


  //
  //////    jQuery           ////////////////////////////////
  //

  // :: (b -> a -> b) -> jQuery a -> b -> b
  function foldJquery(fn, init, obj) {
    var result;

    result = init;

    return obj.each(function(i, e) {
      result = fn(result, e);
    });

    return result;
  }

  // :: (a -> b) -> jQuery a -> jQuery b
  function mapJquery(fn, obj) {
    return obj.map(function(i, e) {
      return fn(e);
    });
  }


  //
  //////    Primatives       ////////////////////////////////
  //

  // :: String/Number a => [a] -> a
  function concatPrimatives(xs) {
    var memo;

    if (typeof xs[0] === 'string') {
      memo = '';
    }
    else if (typeof xs[0] === 'number') {
      memo = 0;
    }
    else {
      throw new TypeError('concatPrimatives only works on strings and numbers');
    }

    return fold(function(m, v) {
      return m + v;
    }, memo, xs);
  }


  //
  //////    Objects/Hashes   ////////////////////////////////
  //

  // :: (b -> (String, a) -> b) -> Object a -> b -> b
  function foldHash(fn, init, obj) {
    var k, result;

    result = init;

    for (k in obj) {
      if (obj.hasOwnProperty(k)) {
        result = fn(result, obj[k]);
      }
    }

    return result;
  }

  // :: [Object a] -> Object a
  function concatHashes(xs) {
    return fold(function(m, obj) {
      var k;

      for (k in obj) {
        if (obj.hasOwnProperty(k)) {
          m[k] = obj[k];
        }
      }

      return m;
    }, {}, xs);
  }

  // :: (a -> Object b) -> Object a -> Object b
  function flatMapHash(fn, obj) {
    return foldHash(function(m, v) {
      var k, obj;

      obj = fn(v);

      for (k in obj) {
        if (obj.hasOwnProperty(k)) {
          m[k] = obj[k];
        }
      }

      return m;
    }, {}, obj);
  }

  // :: (a -> b) -> Object a -> Object b
  function mapHash(fn, obj) {
    var k, result;

    result = {};

    for (k in obj) {
      if (obj.hasOwnProperty(k)) {
        result[k] = fn(obj[k]);
      }
    }

    return result;
  }

  //
  //////    Functions        ////////////////////////////////
  //

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

  // :: (a -> b) -> (a -> b -> c) -> (a -> c)
  function flatMapFunction(fn, fx) {
    return function(a) {
      return fx(a, fn(a));
    };
  }

  //
  //////    Multi-methods    ////////////////////////////////
  //

  // :: Semigroup s => s a -> .. -> s a -> s a
  function concat(a) {
    var result, i;

    // Arrays + conformant semigroups
    if (hasMethod('concat', a)) {
      result = arguments[0].concat(arguments[1]);

      for (i = 2; i < arguments.length; i++) {
        result = result.concat(arguments[i]);
      }

      return result;
    }
    // Functions
    else if (typeof a === 'function') {
      // ... just compose backwards?
      return compose.apply(null, Array.prototype.slice.call(arguments).reverse());
    }
    // Plain Hashes
    else if (typeof a === 'object') {
      return concatHashes(arguments);
    }
    // Primitives
    else {
      return concatPrimatives(arguments);
    }
  }

  // :: Semigroup s => [s a] -> s a
  function mconcat(xs) {
    return concat.apply(null, xs);
  }

  // :: Monad m => (a -> [b]) -> [a] -> [b]
  function flatMap(fn, xs) {
    // Null/undefined
    if (isNullOrUndefined(xs)) {
      return xs;
    }
    // Our own flatmappables
    if (hasMethod('flatMap', xs)) {
      return xs.flatMap(fn);
    }
    // Arrays
    else if (Array.isArray(xs)) {
      return arrayFlatten(arrayMap(fn, xs));
    }
    // Promises
    else if (hasMethod('then', xs)) {
      return flatMapPromise(fn, xs);
    }
    // Fantasy land
    else if (hasMethod('chain', xs)) {
      return xs.chain(fn);
    }
    // Functions
    else if (typeof xs === 'function') {
      return flatMapFunction(fn, xs);
    }
    // Plain objects
    else if (typeof xs === 'object') {
      return flatMapHash(fn, xs);
    }
    else {
      return fn(xs);
    }
  }

  // :: Foldable f => (b -> a -> b) -> b -> f a -> b
  function fold(fn, init, xs) {
    // Arguments
    if (isArguments(xs)) {
      return foldArguments(fn, init, xs);
    }
    // Arrays
    else if (isArray(xs)) {
      return foldArray(fn, init, xs);
    }
    else if (isJquery(xs)) {
      return foldJquery(fn, init, xs);
    }
    // Objects
    else if (typeof xs === 'object') {
      return foldHash(fn, init, xs);
    }
  }

  // :: Functor f => (a -> b) -> f a -> f b
  function map(fn, xs) {
    // Null/undefined
    if (isNullOrUndefined(xs)) {
      return xs;
    }
    // Compatable functors
    else if (hasMethod('fmap', xs)) {
      return xs.fmap(fn);
    }
    // Arrays
    else if (Array.isArray(xs)) {
      return arrayMap(fn, xs);
    }
    // Functions
    else if (typeof xs === 'function') {
      return compose(fn, xs);
    }
    // Argument Objects
    else if (isArguments(xs)) {
      return mapArguments(fn, xs);
    }
    // Thenables / A+ Promises
    else if (hasMethod('then', xs)) {
      return mapPromise(fn, xs);
    }
    // jQuery objects
    else if (isJquery(xs)) {
      return mapJquery(fn, xs);
    }
    // Fantasy Land Functors
    else if (hasMethod('map', xs)) {
      return xs.map(function(x) { return fn(x); });
    }
    // Other objects
    else if (typeof xs === 'object') {
      return mapObject(fn, xs);
    }
    // Primatives (is this the wrong behavior?)
    else {
      return fn(xs);
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



  //////    Data Types       ////////////////////////////////

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

  return {
    // Core functions
    lift     : lift,
    liftM    : liftM,
    liftC    : liftC,
    liftBi   : liftBi,
    concat   : concat,
    mconcat  : mconcat,
    flatMap  : flatMap,
    fold     : fold,
    map      : map,
    compose  : compose,

    // Maybe
    just     : just,
    nothing  : nothing,

    // Either
    left     : left,
    right    : right,

    // Validation
    success  : success,
    failure  : failure,

    // Futures
    future   : future,
    resolved : resolved,

    // Instances
    Maybe      : _Maybe,
    Either     : _Either,
    Validation : _Validation,
    Future     : _Future
  };
});
