This is not a proper guide on functional programming or monads or anything like that. This is just a bit of documentation to help you get started using *fun-lite*.


## Introduction

Lets say you have a function. It accepts a string and produces an integer. Maybe this function is called `stringLength`. We might write that down like this:

    stringLength :: String -> Number

We would use it like this.

    stringLength('Hello'); // => 5

Everything is going wonderfully until one day when we need to use our function on an array of strings to produce an array of numbers. We can use an array's map function to help us do this:

    ['Hello', 'World'].map(stringLength); // => [5, 5]

That wasn't too bad, but if we want to use this operation like a function instead of a method call we are going to have to define it separately.

    function stringLengthArray(arr) {
      return arr.map(stringLength);
    }

This sort of thing is useful because now the function can be composed. Lets say we have another function called `total` which takes an array of numbers and adds them all together to produce another number. We could compose those functions together to get a new function which gives us the total lenth of all strings in an array.

    var totalStringLength = compose(total, stringLengthArray);

    totalStringLength(['Hello', 'World']); // => 10

*fun-lite* exists to make this sort of thing easier through a mechanism called "lifting". You can take any function which operates on regular things and feed it into the `lift` function and it will now operate on arrays of those things.

    // add          :: Number -> Number -> Number
    function add(a, b) { return a + b; }

    // product      :: [Number] -> [Number] -> [Number]
    var product = lift(add);

    // totalProduct :: [Number] -> [Number] -> Number
    var totalProduct = compose(total, product);

    product([1,2], [3, 4]);       // => [4, 5, 5, 6]

    totalProduct([1, 2], [3, 4]); // => 20



## So much more than arrays

In the last examples we just looked at functions being lifted to operate on arrays. The `lift` function provided by *fun-lite* is actually much broader than that, it works on any container-like object that provides these methods:

1. `fmap` / `map` ` :: this a -> (a -> b) -> this b`
2. `flatMap` / `chain` `:: this a -> (a -> this b) -> this b`

That's pretty abstract. The `this` just means an instance of the object. See if you can understand what it is saying about the map method on arrays. Don't worry if you don't get it, it's probably not too important. All you really need to know is that `lift` makes a function work on more than just arrays of things, it makes it work on all kinds of containers of things.

When we take our function `stringLength` and we lift it I said that we made it so that it consumes an **array** of **strings** and returns an **array** of **numbers**. I lied. It used to be a function which transformed a **string** into a **number**; here is a list of some of the things it might transform now.

- An **object** containing **strings** _to_ an **object** containing **numbers**
- A **function** from something to a **string** _to_ a **function** from something to a **number**
- A **promise** of a **string** _to_ a **promise** of a **number**
- An **array** of **strings** _to_ an **array** of **numbers**

This is just scratching the surface. The world of things that our humble function can operate on now is mindbogglingly vast.


## The Rules

If you want to play the function lifting game like a cool person then you have to play by the rules.

### No mixing and matching

If your lifted function takes multiple arguments then they must all be of the same container type when you call the function. You can lift the function `add` so that it operates on containers of numbers and returns a container of numbers but all those containers have to be the same.

For example, you could call it on arrays of numbers:

    lift(add)([1,2], [3, 4]); // => [4, 5, 5, 6]

... or on some promises of numbers (using [when](https://github.com/cujojs/when)):

    lift(add)(when(3), when(5)); // => Promise Either Error 8

But never mix them!

    lift(add)([1,2], when(5)); // OMG what are you doing!

No mixing.

### Use the right lift

If you have a function like `String -> [String]` and you want to turn it into a function from `[String] -> [String]` then you might be in trouble. The `lift` function would take `String -> [String]` and turn it into `[String] -> [[String]]`.

Perhaps our function is breaks a string at the spaces into an array of words. We'll call it `splitWords`.

    splitWords('Hello World'); // => ['Hello', 'World']

    lift(splitWords)(['Hello World', 'Goodbye Remy']);
    // => [['Hello', 'World'], ['Goodbye', 'Remy']]

Not what we wanted.

We have a special kind of lift to use called `liftM`. It's like the regular lift function except it only lifts the arguments without lifing the return type.

    liftM(splitWords)(['Hello World', 'Goodbye Remy']);
    // => ['Hello', 'World', 'Goodbye', 'Remy']

Great.

Remember, the same rules for mixing and matching apply here. That makes a `liftM`'d function less versitle than a regular `lift`'d function; the container type for it's arguments is already locked-in by it's return type. If you use `liftM` on a function that returns a promise then the only valid arguments it can accept will be promises.

### Inventing your own containers

If you are just starting with this stuff then just stick with the containers provided by this libarary.

- Maybe (for operations that can return null)
- Either (for opertations that can generate errors)
- Validation (for operations that accumulate errors)
- Future (for asynchronous operations)
- Lens (for mutating state)

These are what I would say are the necessary building blocks for getting started. Before you run off building more containers you should take the time to learn the [monad laws](https://github.com/fantasyland/fantasy-land#monad) because you might find yourself in a spot of trouble if your containers don't follow those laws perfectly.

Alternatively, try using some of the monads provided by [fantasy land](https://github.com/fantasyland)
