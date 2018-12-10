import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import { Router } from 'express';
import { isMiddlewarePivot } from 'oors-express/build/validators';
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
              routes: [v.isDefault({}), v.isObject()],
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
    const router = Router();

    this.deps['oors.express'].middlewares.insert('nextInstall', {
      path: '/',
      id: 'webRouter',
      factory: () => router,
    });

    this.export({ router });
  }
}

export default Web;
