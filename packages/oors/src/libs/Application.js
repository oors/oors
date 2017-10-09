import OrderedList from './OrderedList';
import ExpressApplication from './ExpressApplication';
import ModulesManager from './ModulesManager';

class Application extends ExpressApplication {
  constructor(settings = {}) {
    super();
    this.merge(settings);
    this.isDev = this.get('env') === 'development';
    this.middlewares = new OrderedList();
    this.disable('x-powered-by');
    this.modules = new ModulesManager({
      app: this,
    });
  }

  async boot() {
    this.emit('before:boot');
    await this.modules.setup();
    await this.applyMiddlewares();
    this.emit('after:boot');
  }

  async applyMiddlewares() {
    const middlewares = await Promise.all(
      this.middlewares
        .reject({ enabled: false })
        .map(async ({ factory, params, path }) => {
          const args = Array.isArray(params) ? params : [params];
          const middleware = await Promise.resolve(factory(...args));
          return {
            path,
            middleware,
          };
        }),
    );

    middlewares.forEach(({ middleware, path }) => {
      if (path) {
        this.use(path, middleware);
      } else {
        this.use(middleware);
      }
    });
  }

  async listen(port) {
    await this.boot();
    return new Promise(resolve => {
      this.set('startTime', new Date());
      return ExpressApplication.prototype.listen.call(this, port, resolve);
    });
  }

  merge(settings) {
    return Object.keys(settings).reduce(
      (acc, key) => ({
        ...acc,
        [key]: this.set(key, settings[key]),
      }),
      {},
    );
  }
}

export default Application;
