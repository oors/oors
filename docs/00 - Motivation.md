oors's goal is to be a simple, but full featured framework for building server side and client side applications.

Our plan is to provide enough functionality to eliminate the tedious and repetitive tasks that consume 80% of the development time (could go down to 70%, 60%), so you can concentrate on the real core of your project.

We use express.js as a server side web framework, which is simple, unopinionated, powerful and fast.
That is great because you're free to do your own setup, but when it comes to integrating 3rd party extensions you have to follow strict and rigid instructions and often times you'll run into issues.

express.js puts on the table a great paradigm of a list of tasks (middlewares) that will run between intercepting a request and returning a response, an implementation of the chain of responsibility design pattern.
You can use middlewares to extend the framework, but then you're coupled to the request lifecycle and this can affect the performance of your app (remember that middlewares will be executed with every request).
Also the order of middlewares in the middleware chain is important, especially because some of them can stop the execution or modify the request in a way that will impact downstream middlewares, this way having a good control over the middleware chain is crucial.

Simplicity always comes with a cost, and that is extensibility.
But we tried to solve the extensibility issue while maintaining express.js simple by providing a module system that allows you to divide your project into multiple bits that can be developed in isolation and collaboration.
We've also improved the way you work with middlewares - you get access to a middlewares array providing simple ways to insert / update / move or remove items.
