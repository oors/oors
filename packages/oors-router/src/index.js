import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import path from 'path';
import { Router as ExpressRouter } from 'express';
import ErrorWrapper from 'oors/build/errors/ErrorWrapper';
import BaseRouter from './libs/Router';
import * as helpers from './libs/helpers';
import generateRESTRouter from './libs/generateRESTRouter';

class Router extends Module {
  static validateConfig = validate(
    v.isSchema({
      middlewarePivot: v.isAny(
        v.isString(),
        v.isSchema({
          before: v.isAny(v.isString(), v.isUndefined()),
          after: v.isAny(v.isString(), v.isUndefined()),
        }),
      ),
      autoload: [v.isDefault(true), v.isBoolean()],
    }),
  );

  name = 'oors.router';

  addRouter = (...args) => {
    if (args.length === 2) {
      args.unshift('/');
    }

    const [pathPrefix, id, router] = args;

    this.deps['oors.express'].middlewares.insert(this.getConfig('middlewarePivot'), {
      path: pathPrefix,
      id,
      factory: () => router,
    });
  };

  loadModuleRouter = module => {
    let moduleConfig;

    try {
      moduleConfig = validate(
        v.isSchema({
          autoload: [v.isDefault(true), v.isBoolean()],
          prefixPath: [v.isDefault('/'), v.isString()],
        }),
      )(module.getConfig('router', {}));
    } catch (error) {
      throw new ErrorWrapper(error, `Invalid module "${module.name}" router configuration!`);
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

  async setup({ autoload }) {
    await this.loadDependencies(['oors.express']);
    const { addRouter } = this;
    const router = ExpressRouter();

    if (autoload) {
      await this.runHook('load', this.loadModuleRouter, {
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
