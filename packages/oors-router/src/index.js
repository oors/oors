import { Module } from 'oors';
import path from 'path';
import { Router as ExpressRouter } from 'express';
import pivotSchema from 'oors/build/schemas/pivot';
import BaseRouter from './libs/Router';
import * as helpers from './libs/helpers';
import generateRESTRouter from './libs/generateRESTRouter';
import validatorMiddleware from './middlewares/validator';

class Router extends Module {
  static schema = {
    type: 'object',
    properties: {
      middlewarePivot: pivotSchema,
      validatorMiddlewarePivot: {
        ...pivotSchema,
        default: {
          before: 'isMethod',
        },
      },
      autoload: {
        type: 'boolean',
        default: true,
      },
    },
  };

  static moduleSchema = {
    type: 'object',
    properties: {
      autoload: {
        type: 'boolean',
        default: true,
      },
      prefixPath: {
        type: 'string',
        default: '/',
      },
    },
  };

  name = 'oors.router';

  initialize() {
    this.validateModule = this.manager.compileSchema(this.constructor.moduleSchema);
  }

  addRouter = (...args) => {
    if (args.length === 2) {
      args.unshift('/');
    }

    const [pathPrefix, id, router] = args;

    this.app.middlewares.insert(this.getConfig('middlewarePivot'), {
      path: pathPrefix,
      id,
      factory: () => router,
    });
  };

  loadModuleRouter = module => {
    const moduleConfig = module.getConfig('router', {});

    if (!this.validateModule(moduleConfig)) {
      throw new Error(
        `Invalid module router configuration:\n${JSON.stringify(this.validateModule.errors)}!`,
      );
    }

    const { autoload, prefixPath } = moduleConfig;

    if (!autoload) {
      return;
    }

    let { router } = module;

    if (!router) {
      const routerPath = path.resolve(path.dirname(module.filePath), 'router');
      try {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        router = require(routerPath).default;
      } catch (err) {} // eslint-disable-line no-empty
    }

    if (router) {
      this.addRouter(prefixPath, `${module.name}Router`, router);
    }
  };

  async setup({ autoload, validatorMiddlewarePivot }) {
    const { addRouter } = this;
    const router = ExpressRouter();

    if (autoload) {
      await this.createHook('load', this.loadModuleRouter, {
        addRouter,
        router,
      });
    }

    this.app.middlewares.insert(validatorMiddlewarePivot, validatorMiddleware);

    addRouter('mainRouter', router);

    this.export({
      generateRESTRouter,
      addRouter,
      router,
    });
  }
}

export { Router as default, BaseRouter as Router, helpers };
