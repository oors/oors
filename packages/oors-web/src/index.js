import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import { Router } from 'express';
import { isMiddlewarePivot } from 'oors-express/build/validators';
import cacheableResponse from 'cacheable-response';
import nextInstallMiddleware from './middlewares/nextInstall';
import nextRenderMiddleware from './middlewares/nextRender';

class Web extends Module {
  static validateConfig = validate(
    v.isSchema({
      nextMiddlewarePivot: [v.isDefault('isMethod'), isMiddlewarePivot()],
      nextMiddlewareConfig: [
        v.isDefault({}),
        v.isSchema({
          path: v.isAny(v.isUndefined(), v.isString()),
          params: [
            v.isDefault({}),
            v.isSchema({
              appConfig: [
                v.isDefault({}),
                v.isSchema({
                  dev: [v.isDefault(true), v.isBoolean()],
                  dir: [v.isRequired(), v.isString()],
                }),
              ],
            }),
          ],
        }),
      ],
      router: [
        v.isDefault({}),
        v.isSchema({
          autoload: [v.isDefault(false), v.isBoolean()],
        }),
      ],
      cacheConfig: [
        v.isDefault({}),
        v.isSchema({
          ttl: [v.isDefault(1000 * 60 * 60), v.isNumber()],
        }),
      ],
    }),
  );

  name = 'oors.web';

  hooks = {
    'oors.express.middlewares': ({ middlewares }) => {
      middlewares.insert(
        this.getConfig('nextMiddlewarePivot'),
        {
          ...nextInstallMiddleware,
          ...this.getConfig('nextMiddlewareConfig'),
        },
        nextRenderMiddleware,
      );
    },
  };

  async setup() {
    await this.loadDependencies(['oors.express']);

    this.router = Router();

    this.deps['oors.express'].middlewares.insertAfter('nextInstall', {
      path: '/',
      id: 'webRouter',
      factory: () => this.router,
    });

    this.cache = this.createCache();

    this.exportProperties(['router', 'cache', 'renderCache']);
  }

  createCache = (config = {}) =>
    cacheableResponse({
      get: async ({ req, res, path, params = {} }) => ({
        data: await req.nextApp.renderToHTML(req, res, path, params),
      }),
      send: ({ data, res }) => res.send(data),
      ...this.getConfig('cacheConfig'),
      ...config,
    });

  renderCache = ({ req, res, path, params }) =>
    this.cache({
      req,
      res,
      path: path || req.path,
      params: params || { ...req.query, ...req.params },
    });
}

export default Web;
