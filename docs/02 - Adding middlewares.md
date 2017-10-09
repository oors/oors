While you can still use the standard practices of adding middlewares (https://expressjs.com/en/guide/writing-middleware.html):

```js
app.use((req, res, next) => {
  console.log(`Request made at: ${req.path}`);
  next();
});
```

oors really shines when you use its configurable middleware chain.
The middleware chain is an enhanced array that makes it easy to insert / update / move and remove middlewares.

Why is that a good thing? Because you want to be able to manipulate the list of middleware from outside the application (by leveraging modules).

The previous functionality can be written like this by using the middleware chain:

```js
import { Application } from 'oors';
import { Router } from 'express';

const app = new Application();
const router = Router();

const logRequestMiddleware = (req, res, next) => {
  console.log(`Request made at: ${req.path}`);
  next();
};

router.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.middlewares.push(
  ...[
    {
      id: 'logRequest',
      factory: () => logRequestMiddleware,
    },
    {
      id: 'router',
      factory: () => router,
    },
  ],
);

app.listen(3000).then(() => {
  console.log('application started...');
});
```

We created a new router that will be registered as a middleware. Remember that express routers are middlewares themselves - https://expressjs.com/en/guide/routing.html.

A oors middleware is an object that has to have at the very minimum 2 properties:
- a unique id
- a factory function that returns an actual express middleware

Armed with this knowledge, we simply push the middlewares onto the app.middlewares stack.

The application will register the middlewares very late in the process and only after you called `app.listen`.

While the benefits are not so obvious by looking at a simple example as the one above, we'll get to feel them once we dive into modules usage.
