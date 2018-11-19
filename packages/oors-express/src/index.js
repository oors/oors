import { Module } from 'oors';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import expressReactViews from 'express-react-views';
import ExpressApplication from './ExpressApplication';
import MiddlewareStore from './MiddlewareStore';
import * as helpers from './helpers';
import middlewareSchema from './schemas/middleware';

class ExpressModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      server: {
        type: 'object',
        properties: {
          options: {
            type: ['object', 'null'],
            default: null,
          },
          ssl: {
            type: 'boolean',
            default: false,
          },
        },
        default: {},
      },
      settings: {
        type: 'object',
        properties: {
          views: {
            type: 'string',
            default: '',
          },
          'view engine': {
            type: 'string',
            default: 'js',
          },
        },
        default: {},
      },
      middlewares: {
        type: 'array',
        items: middlewareSchema,
        default: [],
      },
    },
    required: [],
  };

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
