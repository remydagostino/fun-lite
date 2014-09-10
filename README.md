# Fun Lite

*This is still a work in progress...*

A friendly drop-in functional programming library to work along side existing javascript.

This library tries to be as practical and as small as possible. I want to provide the advantages of excellent abstractions that monads and functors provide while still embracing the way that javascript is usually written. This isn't a collection of utility belt functions; it is just a hand full of useful monads wrapped up in a convenient API. I would suggest using this library alongside Lodash, Underscore or Ramda (my personal favorite).

- No modifying of native objects
- Practicality first, fantasy-land compliance second
- Just the monads, not piles of utility functions
- No curried functions (they can be confusing without types)
- Purely functional API, classes and their methods are hidden
- Interop with existing environments without monkey patching
  - jQuery
  - Bacon JS
  - Browser DOM
  - Promises A+


## Why?

Many of the existing options for functional programming in javascript are hard to use in an established project.

I want to provide some quick and easy ways to get started.


## The Ugly

Modularity is a good thing. This library isn't modular at all. The goal in this instance is convenience and practicality without breaking anything in the spirit of jQuery.

Remember this is fun-lite. If you want to try some real fun then look at these:

- [Fantasy Land](https://github.com/fantasyland)
- [Monet.js](http://cwmyers.github.io/monet.js/)
- [Folktale](http://folktale.github.io/)
- [Bilby.js](http://bilby.brianmckenna.org/)
