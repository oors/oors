import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import expressReactViews from 'express-react-views';
import ExpressApplication from './ExpressApplication';
import MiddlewareStore from './MiddlewareStore';
import * as helpers from './helpers';

class ExpressModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      server: [
        v.isDefault({}),
        v.isSchema({
          options: [v.isDefault(null), v.isAny(v.isObject(), v.isNull())],
          ssl: [v.isDefault(false), v.isBoolean()],
        }),
      ],
      settings: [
        v.isDefault({}),
        v.isSchema({
          views: [v.isDefault(''), v.isString()],
          'view engine': [v.isDefault('js'), v.isString()],
        }),
      ],
      middlewares: v.isArray(
        v.isSchema({
          id: v.isString(),
          path: [v.isDefault('/'), v.isString()],
          factory: v.isFunction(),
          apply: v.isAny(v.isFunction(), v.isUndefined()),
          params: v.isDefault({}),
          enabled: [v.isDefault(true), v.isBoolean()],
        }),
      ),
    }),
  );

  name = 'oors.express';

  async setup({ settings, middlewares }) {
    this.middlewares = new MiddlewareStore();
    this.middlewares.push(...middlewares);
    this.app = this.createApplication(
      {
        modules: this.manager,
      },
      settings,
    );
    this.server = this.createServer(this.app.handle.bind(this.app));
    this.app.modules = this.manager;
    this.app.server = this.server;
    this.exportProperties(['app', 'server', 'listen', 'middlewares']);

    await this.runHook('middlewares', () => {}, {
      middlewares: this.middlewares,
    });
  }

  async teardown() {
    if (!this.server.listening) {
      return;
    }

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

  // eslint-disable-next-line class-methods-use-this
  createApplication(context, settings) {
    const app = new ExpressApplication(context, settings);
    app.disable('x-powered-by');
    app.engine('js', expressReactViews.createEngine());
    return app;
  }

  createServer = handler => {
    const { options, ssl } = this.getConfig('server');
    const Server = ssl ? HTTPSServer : HTTPServer;
    return options ? new Server(options, handler) : new Server(handler);
  };

  listen = async port => {
    await this.applyMiddlewares();
    return new Promise(resolve => this.app.listen(port, resolve));
  };

  applyMiddlewares = async () => {
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
        apply({ app: this.app, path, middleware });
      } else if (path) {
        this.app.use(path, middleware);
      } else {
        this.app.use(middleware);
      }
    });
  };
}

export { ExpressModule as default, helpers };
