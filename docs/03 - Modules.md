An oors module is a first class citizen.

They work like mini-apps and you use them to bundle together specific functionality:
- adding routers
- registering services
- working with GraphQL
- etc.

The modules are registered by a modules manager. Its job is to provide a communication layer between modules, to resolve dependencies between them and allow them to create hooks.

The simplest module that doesn't provide any functionality can be created like this:

```js
import { Application, Module } from 'oors';

const app = new Application();

app.modules.add(new Module({ name: 'simple' }));

app.listen(3000).then(() => {
  console.log('application started...');
});
```

The single argument of a module constructor is a configuration object local to the module.
A module can define a `configSchema` static property which can be a Joi object and is called to validate the configuration provided through the module constructor.
You can access this configuration inside a module by a `this.getConfig('key.path', defaultValue)` method.

A module has a lifecycle of its own which is handled by 2 methods (empty by default):
- initialize(config, manager)
- setup(config, manager)

`initialize` is called right after registering the module (by calling the `add` method of a manager). This is not the right place where you can perform async operations, but mainly initialization tasks.
`setup` can be an async method returning a promise. This way you can perform async tasks inside the setup method (like connecting to a database). Other modules depending on it will wait for this promise to be resolved before continuing execution.

The common pattern is to create a new module class that extends the base Module.

```js
class Simple extends Module {
  initialize() {
    console.log(`initializing the ${this.name} module`);
  }

  setup() {
    return new Promise(resolve => {
      setTimeout(resolve, 2000);
    });
  }
}
```
Inside a module you have access to the manager by `this.manager` and the application by `this.app`.

Let's rewrite the 'Hello, world!' example by using a module:

```js
import { Application, Module } from 'oors';
import { Router } from 'express';

const app = new Application();

class Simple extends Module {
  initialize() {
    const router = Router();
    router.get('/', (req, res) => {
      res.send('Hello, world!');
    });

    this.app.middlewares.push({
      id: `${this.name}Router`,
      factory: () => router,
    });
  }
}

app.modules.add(new Simple());

app.listen(3000).then(() => {
  console.log('application started...');
});
```

Commands and hooks
-------
A module can run a command, which is a function that will run through the entire list of modules, skipping the ones defining the their own implementation (called a hook).
It's one of those concepts better explained with an example, so let's see an example of a command that will collect the names of the existing modules:

```js
import { ModulesManager, Module } from 'oors';

const modules = new ModulesManager();
const module1 = new Module({ name: 'one' });
const module2 = new Module({ name: 'two' });
let names;

class NamesCollector extends Module {
  async setup() {
    names = await this.createHook('collectNames', module => module.name);
  }
}

modules.add([module1, module2, new NamesCollector()]);

modules.setup().then(() => {
  console.log(names);
});
```

We're creating a new instance of a ModulesManager and adding two dummy modules. The NamesCollector module defines a setup function and in here we're going to call a command.
The signature of a command is this:

```js
const returnValue = this.createHook(commandName, command, context);
```

- commandName - is a string and the name is important, mainly because other modules will be able to define their own logic associated with the command name; examples of command names: `router:load`, `graphQL:buildContext`
- command - is a function that will be called once per module receiving as the first argument the module in cause and the context as the 2nd argument; here you have the chance to introspect a module and extract data or call methods on it
- context - can be any data type
- returnValue - is a promise that will be resolved once the command is done processing; if ran successfully, the resolve value of the promise is going to be an array of values (one item per module).

Commands are great when used in conjunction with hooks.
To show an example of that, let's say module1 is a bit paranoid, and he doesn't want to tell us his name.

```js
import { ModulesManager, Module } from 'oors';

const modules = new ModulesManager();
const module2 = new Module({ name: 'two' });
let names;

class Module1 extends Module {
  name = 'one'
  hooks = {
    collectNames: () => 'I won\'t tell you!',
  }
}

class NamesCollector extends Module {
  async setup() {
    names = await this.createHook('collectNames', module => module.name);
  }
}

modules.add([new Module1(), module2, new NamesCollector()]);

modules.setup().then(() => {
  console.log(names);
});
```

We can see that even though its name is "one", we get something else, and that's because the module defined a hook with the same name as our command.

It's good to know that you can define "before" and "after" hooks like this:

```js
class Module1 extends Module {
  name = 'one'
  hooks = {
    'before:collectNames': () => console.log('Why do you need to know my name?'),
    collectNames: () => 'I won\'t tell you!',
    'after:collectNames': () => console.log('I lied to you.'),
  }
}
```
