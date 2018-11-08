import OrderedList from './OrderedList';
import ExpressApplication from './ExpressApplication';
import ModulesManager from './ModulesManager';

class Application extends ExpressApplication {
  constructor(context = {}, settings = {}) {
    super();
    this.merge(settings);
    this.isDev = this.get('env') === 'development';
    this.middlewares = new OrderedList();
    this.disable('x-powered-by');
    this.modules = new ModulesManager({
      ...context,
      app: this,
    });
  }

  async boot() {
    this.emit('before:boot');
    await this.modules.setup();
    await this.applyMiddlewares();
    this.emit('after:boot');
  }

  async shutdown() {
    this.emit('before:shutdown');

    if (this.server && this.server.listening) {
      await new Promise((resolve, reject) => {
        this.server.close(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    await this.modules.teardown();
    this.emit('after:shutdown');
  }

  async applyMiddlewares() {
    const middlewares = await Promise.all(
      this.middlewares
        .reject({ enabled: false })
        .map(async ({ factory, params = [], path, apply }) => {
          const args = Array.isArray(params) ? params : [params];
          const middleware = factory ? await Promise.resolve(factory(...args)) : false;

          return {
            path,
            middleware,
            apply,
          };
        }),
    );

    middlewares.forEach(({ middleware, path, apply }) => {
      if (apply) {
        apply({ app: this, path, middleware });
      } else if (path) {
        this.use(path, middleware);
      } else {
        this.use(middleware);
      }
    });
  }

  async listen(port) {
    await this.boot();
    return new Promise(resolve => {
      this.set('startTime', Date.now());
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
