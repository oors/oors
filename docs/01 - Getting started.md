oors is a lightweight node.js web framework built on top of express.js.

It focuses on developers productivity by providing a modular architecture that doesn't stay in your way.

The "Hello world!" application with oors looks like this:

```js
import { Application } from 'oors';

const app = new Application();

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.listen(3000).then(() => {
  console.log('application started...');
});
```

`Application` wraps the express application and it provides additional functionality on top of it.

From this point onwards it all boils down to adding middlewares and registering modules.
