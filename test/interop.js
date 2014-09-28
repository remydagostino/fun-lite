var fun     = require('../src/fun-lite'),
    assert  = require('chai').assert,
    when    = require('when'),
    jQuery  = require('jquery');

// Helpers
function add(a, b) { return a + b };
function divideBy(b, a) { return a / b };

var halve   = divideBy.bind(null, 2);
var addFive = add.bind(null, 5);

function allArgs() {
  return arguments;
}

function split(str) {
  return str.split('');
}

function bloatObj(v) {
  var obj = {};

  obj[v] = v;
  obj['_' + v] = v;

  return obj;
}


describe('Fold', function() {
  it('adds arguments of numbers', function() {
    assert.equal(
      fun.fold(add, 0, allArgs(1,2,3,4)),
      10
    );
  });

  it('adds arrays of numbers', function() {
    assert.equal(
      fun.fold(add, 0, [1,2,3,4]),
      10
    );
  });

  it('folds objects of numbers', function() {
    assert.equal(
      fun.fold(add, 0, { a: 1, b: 2, c: 3, d: 4 }),
      10
    );
  });

});

describe('Concat', function() {
  it('joins arrays', function() {
    assert.deepEqual(
      fun.concat([1,2,3], [4, 5, 6], [7, 8, 9]),
      [1,2,3, 4, 5, 6, 7, 8, 9]
    )
  });

  it('sequences functions', function() {
    var joined = fun.concat(halve, halve, addFive);

    assert.equal(joined(40), 15);
  });

  it('extends objects', function() {
    var a = { x: 5, y: 10, z: 15 },
        b = { w: 20 },
        c = { y: 3 };


    assert.deepEqual(
      fun.concat(a, b, c),
      { x: 5, y: 3, z: 15, w: 20 }
    );


    assert.deepEqual(a, { x: 5, y: 10, z: 15});
  });

  it('adds numbers', function() {
    assert.equal(fun.concat(1,2,3), 6);
  });

  it('joins strings', function() {
    assert.equal(fun.concat('Hello', ' ', 'World'), 'Hello World');
  });
});

describe('Flat map', function() {
  it('maps and flattens arrays', function() {
    assert.deepEqual(
      fun.flatMap(split, ['foo', 'bar']),
      ['f','o','o','b','a','r']
    );
  });

  it('maps and flattens functions', function() {
    assert.deepEqual(
      fun.flatMap(addFive, add)(10),
      25
    );
  });

  it('maps promises', function(done) {
    fun.flatMap(
      function(a) {
        return when(a + ' World').delay(50);
      },
      when('Hello').delay(200)
    )
    .then(function(x) {
      assert.equal(x, 'Hello World');
      done();
    })
  });

  it('maps and flattens object hashes', function() {
    assert.deepEqual(
      fun.flatMap(bloatObj, { a: 'foo', b: 'bar' }),
      {
        'foo': 'foo',
        '_foo': 'foo',
        'bar': 'bar',
        '_bar': 'bar'
      }
    )
  })
});

describe('Lifting primatives', function() {
  it('Maps over primatives', function() {
    assert.deepEqual(fun.lift(add)('a', 'b'), 'ab');
    assert.deepEqual(fun.lift(add)(10, 5), 15);
  });

  it('Treats null in arguments as a nothing', function() {
    assert.equal(fun.lift(add)('a', 'b'), 'ab');
    assert.equal(fun.lift(add)('a', null), null);
    assert.equal(fun.lift(add)(null, 'b'), null);
    assert.equal(fun.lift(add)(null, null), null);
  });
});


