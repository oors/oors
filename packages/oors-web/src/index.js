import { Module } from 'oors';
import { Router } from 'express';
import nextInstallMiddleware from './middlewares/nextInstall';
import nextRenderMiddleware from './middlewares/nextRender';

class Web extends Module {
  static schema = {
    type: 'object',
    properties: {
      nextMiddlewarePivot: {
        default: 'isMethod',
      },
      nextMiddlewareConfig: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
          },
          params: {
            type: 'object',
            properties: {
              appConfig: {
                type: 'object',
                default: {
                  dev: true,
                },
              },
              routes: {
                type: 'object',
                default: {},
              },
            },
            default: {},
          },
          enabled: {
            type: 'boolean',
            default: true,
          },
        },
        default: {},
      },
      router: {
        type: 'object',
        properties: {
          autoload: {
            type: 'boolean',
            default: false,
          },
        },
        default: {},
      },
    },
  };

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
    await this.loadDendencies(['oors.express']);
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
