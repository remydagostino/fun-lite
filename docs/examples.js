var fun     = require('../src/fun-lite');

/////////////////////////////////
// Exhibit A - Functors

// :: String -> Number
function length(str) {
  return str.length;
}

length('Hello World');

// Lifted to work on arrays
// [String] -> [String]
fun.lift(length)(['Hello', 'World']);


/////////////////////////////////
// Exhibit B - Applicatives

// :: Number -> Number -> Number
function add(a, b) {
  return a + b;
}

add(5, 7);

// [Number] -> [Number] -> [Number]
fun.lift(add)([1, 2], [3, 4]);


/////////////////////////////////
// Exhibit C - Monads

function split(str) {
  return str.split('');
}

split('Hello');

fun.liftM(split)(['Hello', 'World']);


/////////////////////////////////
// Exhibit D - Composition

function toUpperCase(str) {
  return str.toUpperCase();
}

fun.compose(fun.lift(toUpperCase), fun.liftM(split))(['Hello', 'World']);


/////////////////////////////////
// Exhibit E - Maybe
fun.lift(toUpperCase)(fun.just('Hello'));
fun.lift(toUpperCase)(fun.nothing());

function halveEven(a) {
  if (a % 2 === 0) {
    return fun.just(a / 2);
  }
  else {
    return fun.nothing();
  }
}

var halveEvenM = fun.liftM(halveEven);

fun.compose(halveEvenM, halveEvenM, halveEven)(120);


/////////////////////////////////
// Exhibit F - Either

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

fun.compose(fun.lift(toUpperCase), findRecord)(5);


/////////////////////////////////
// Exhibit G - Validation

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

// Proof that the thing preserves the constructor
Person.prototype.sayHello = function() {
  return 'Hello: ' + this.first;
};

(new Person('Remigio', 'Daggy')).validate().map(function(me) {
  return me.sayHello();
});


/////////////////////////////////
// Exhibit H - Futures

function timedValue(x, time) {
  return fun.future(function(resolve) {
    setTimeout(function() {
      resolve(x);
    }, time);
  });
}

// Just like promises, only lazy
fun.lift(toUpperCase)(timedValue('hello', 500))
.fork(function(result) {
  console.log('future result', result);
});


// Handling failure requires a bit of lifting
fun.lift(findRecord)(timedValue(2, 200))
.map(fun.lift(toUpperCase))
.fork(fun.liftBi(
  function(err) {
    console.log('err', err);
  },
  function(result) {
    console.log('success', result);
  }
));

// Lift on multiple arity functions with futures is special.
// All of the futures will be run in parallel
fun.lift(add)(timedValue(5, 500), timedValue(8, 500))
.fork(function(x) {
  console.log(x);
});

// If you need it to be sequential for some reason, do this.
timedValue(5, 500)
.chain(function(a) {
  return timedValue(8, 500)
  .map(function(b) {
    return add(a, b);
  });
})
.fork(function(x) {
  console.log(x);
});

// Number -> Number -> Future Either String
function addAndLookup(a, b) {
  return fun.future(function(done) {
    done(findRecord(a + b));
  });
}

// liftM also has special behavior
// ... this takes 2 seconds (not 4)
fun.liftM(addAndLookup)(timedValue(1, 2000), timedValue(1, 2000))
.fork(function(x) {
  console.log(x);
})


/////////////////////////////////
// Exhibit H - Lenses


