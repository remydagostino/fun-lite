var fun     = require('../src/fun-lite'),
    assert  = require('chai').assert;

// Interoperability tests
require('./interop');

// :: String -> Number
function length(str) {
  return str.length;
}

// :: Number -> Number -> Number
function add(a, b) {
  return a + b;
}

// :: String -> [String]
function split(str) {
  return str.split('');
}

// :: String -> String
function toUpperCase(str) {
  return str.toUpperCase();
}

// :: Number -> Maybe Number
function halveEven(a) {
  if (a % 2 === 0) {
    return fun.just(a / 2);
  }
  else {
    return fun.nothing();
  }
}

// :: Number -> Either String String
function findRecord(id) {
  var record = ({
    1: 'Remy',
    2: 'Billy',
    5: 'Samson'
  })[id];

  if (record) {
    return fun.right(record);
  }
  else {
    return fun.left('Record "' + id + '" could not be found');
  }
}

// :: String -> Number -> String -> Validation [String] String
function hasLength(name, len, str) {
  if (str.length > len) {
    return fun.success(str);
  }
  else {
    return fun.failure(['"' + name + '" must have length > ' + len]);
  }
}

function Person(first, last) {
  this.first = first;
  this.last  = last;
}

// :: this -> Validation [String] Person
Person.prototype.validate = function() {
  return fun.liftC(Person)(
    hasLength('First', 5, this.first),
    hasLength('Last', 2, this.last)
  );
};

Person.prototype.sayHello = function() {
  return 'Hello: ' + this.first;
};

function timedValue(x, time) {
  return fun.future(function(resolve) {
    setTimeout(function() {
      resolve(x);
    }, time);
  });
}

// Number -> Number -> Future Either String String
function addAndLookup(a, b) {
  return fun.future(function(done) {
    done(findRecord(a + b));
  });
}


describe('Array monad', function() {
  it('lifts over arrays of strings', function() {
    // [String] -> [String]
    assert.deepEqual(
      fun.lift(length)(['Hello', 'World']),
      [5, 5]
    );
  });

  it('lifts over functions of arity 2+', function() {
    // [Number] -> [Number] -> [Number]
    assert.deepEqual(
      fun.lift(add)([1, 2], [3, 4]),
      [4, 5, 5, 6]
    );
  });

  it('lifts only arguments with liftM', function() {
    assert.deepEqual(
      fun.liftM(split)(['Hello', 'World']),
      ['H', 'e', 'l', 'l', 'o', 'W', 'o', 'r', 'l', 'd' ]
    );
  });

  it('composition with lifting', function() {
    assert.deepEqual(
      fun.compose(fun.lift(toUpperCase), fun.liftM(split))(['Hello', 'World']),
      ['H', 'E', 'L', 'L', 'O', 'W', 'O', 'R', 'L', 'D']
    );
  });
});



describe('Maybe monad', function() {
  it('executes when containing a just', function() {
    fun.lift(toUpperCase)(fun.just('Hello'))
    .map(function(x) {
      assert.equal(x, 'HELLO');
    });
  });

  it('does not execute when containing a nothing', function() {
    var count = 0;

    fun.lift(toUpperCase)(fun.nothing())
    .map(function(x) { count += 1; });

    assert.equal(count, 0);
  });

  it('composes functions', function() {
    var count = 0;

    var halveEvenM = fun.liftM(halveEven);

    fun.compose(halveEvenM, halveEvenM, halveEven)(120)
    .map(function(x) {
      assert.equal(x, 15);
    });

    fun.compose(halveEvenM, halveEvenM, halveEven)(100)
    .map(function(x) { count += 1; });

    assert.equal(count, 0);
  })
});



describe('Either monad', function() {
  it('composes functions with success', function() {
    var count = 0;

    fun.compose(fun.lift(toUpperCase), findRecord)(5)
    .bimap(
      function() { count += 1; },
      function(x) {
        assert.equal(x, 'SAMSON');
      }
    );

    assert.equal(count, 0);
  });

  it('composes functions with failure', function() {
    var count = 0;

    fun.compose(fun.lift(toUpperCase), findRecord)(3)
    .bimap(
      function(x) {
        assert.equal(x, 'Record "3" could not be found');
      },
      function() { count += 1; }
    );

    assert.equal(count, 0);
  });
});


describe('Validation (not) monad', function() {
  it('passes through the person when validation passes', function() {
    (new Person('Remigio', 'Daggy')).validate()
    .map(function(me) {
      assert.instanceOf(me, Person);
      assert.equal(me.sayHello(), 'Hello: Remigio');
    });
  });


  it('passes through the person when validation passes', function() {
    var count = 0;

    (new Person('Remigio', 'D')).validate()
    .bimap(
      function(err) {
        assert.deepEqual(err, ['"Last" must have length > 2']);
      },
      function() { count += 1; }
    );

    assert.equal(count, 0);
  });
});



describe('Future monad', function() {
  this.timeout(200);

  it('lifts over basic functions', function(done) {
    fun.lift(toUpperCase)(timedValue('hello', 100))
    .fork(function(x) {
      assert.equal(x, 'HELLO');
      done();
    });
  });

  it('lifts success nested monads', function(done) {
    fun.lift(findRecord)(timedValue(2, 100))
    .map(fun.lift(toUpperCase))
    .fork(fun.liftBi(
      function(err) { },
      function(result) {
        assert.equal(result, 'BILLY');
        done();
      }
    ));
  });

  it('lifts failure over nested monads', function(done) {
    fun.lift(findRecord)(timedValue(3, 100))
    .map(fun.lift(toUpperCase))
    .fork(fun.liftBi(
      function(err) {
        assert.equal(err, 'Record "3" could not be found');
        done();
      },
      function(result) { }
    ));
  });


  it('lift runs in parallel over multiple arity functions', function(done) {
    fun.lift(add)(timedValue(5, 100), timedValue(8, 100))
    .fork(function(x) {
      assert.equal(x, 13);
      done();
    });
  });


  // liftM also has special behavior
  // ... this takes 2 seconds (not 4)
  it('liftM runs parallel also', function(done) {
    fun.liftM(addAndLookup)(timedValue(1, 100), timedValue(1, 100))
    .fork(fun.lift(function(x) {
      assert.equal(x, 'Billy');
      done();
    }))
  })
});





/////////////////////////////////
// Exhibit H - Lenses



