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

  initialize({ nextMiddlewareConfig, nextMiddlewarePivot }) {
    this.app.middlewares.insert(
      nextMiddlewarePivot,
      {
        ...nextInstallMiddleware,
        ...nextMiddlewareConfig,
      },
      nextRenderMiddleware,
    );
  }

  async setup() {
    const router = Router();

    this.app.middlewares.insert('nextInstall', {
      path: '/',
      id: 'webRouter',
      factory: () => router,
    });

    this.export({ router });
  }
}

export default Web;
