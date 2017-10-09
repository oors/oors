import Joi from 'joi';
import { Module } from 'oors';
import path from 'path';
import { Router as ExpressRouter } from 'express';
import BaseRouter from './libs/Router';
import * as helpers from './libs/helpers';
import generateRESTRouter from './libs/generateRESTRouter';

class Router extends Module {
  static configSchema = {
    middlewarePivot: Joi.any().required(),
    autoload: Joi.boolean().default(true),
  };

  static moduleConfigSchema = {
    autoload: Joi.boolean().default(true),
    prefixPath: Joi.string().default('/'),
  };

  name = 'oors.router';

  constructor(...args) {
    super(...args);
    this.addRouter = this.addRouter.bind(this);
    this.loadModuleRouter = this.loadModuleRouter.bind(this);
  }

  addRouter(...args) {
    if (args.length === 2) {
      args.unshift('/');
    }

    const [pathPrefix, id, router] = args;

    this.app.middlewares.insert(this.getConfig('middlewarePivot'), {
      path: pathPrefix,
      id,
      factory: () => router,
    });
  }

  loadModuleRouter(module) {
    const { autoload, prefixPath } = Joi.attempt(
      module.getConfig('router', {}),
      Router.moduleConfigSchema,
    );

    if (!autoload) {
      return;
    }

    let router = module.router;

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
  }

  async setup({ autoload }) {
    const { addRouter } = this;
    const router = ExpressRouter();

    if (autoload) {
      await this.createHook('load', this.loadModuleRouter, {
        addRouter,
        router,
      });
    }

    addRouter('mainRouter', router);

    this.export({
      generateRESTRouter,
      addRouter,
      router,
    });
  }
}

export { Router as default, BaseRouter as Router, helpers };
