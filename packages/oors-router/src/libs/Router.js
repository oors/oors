/* eslint-disable no-restricted-syntax */
import { Router as ExpressRouter } from 'express';

class Router {
  static route = definition => (target, propr, descriptor) => {
    Object.assign(descriptor, {
      enumerable: true,
    });

    Object.assign(descriptor.value, {
      isRoute: true,
      definition,
    });

    return descriptor;
  };

  constructor() {
    this.params = {};
    this.routes = [];
    this.routers = {};
    this.loadRoutes();
    this.middlewares = [];
    this.router = ExpressRouter();
  }

  loadRoutes() {
    for (const propr in this) {
      if (typeof this[propr] === 'function' && this[propr].isRoute) {
        const { definition } = this[propr];
        this.addRoute({
          id: propr,
          path: `/${propr}`,
          ...definition,
          handler: this[propr].bind(this),
        });
      }
    }
  }

  addRoute({ id, method = 'GET', path = '/', handler, middlewares = [] }) {
    this.routes.push({
      id,
      method,
      path,
      handler: Router.wrapHandler(handler),
      middlewares,
    });

    return this;
  }

  addParam(paramName, handler) {
    this.params[paramName] = Router.wrapHandler(handler);
  }

  addRouter(path, router) {
    this.routers[path] = router;
  }

  getRoutes() {
    return this.routes;
  }

  static wrapHandler(handler) {
    return (req, res, next) =>
      Promise.resolve(handler(req, res, next))
        .then(response => {
          if (typeof response !== 'undefined') {
            res.json(response);
          }
        })
        .catch(next);
  }

  use(middlewares) {
    this.middlewares.push(
      ...(Array.isArray(middlewares) ? middlewares : [middlewares]),
    );
  }

  toExpress() {
    if (this.middlewares.length) {
      this.router.use(this.middlewares);
    }

    Object.keys(this.params).forEach(paramName => {
      this.router.param(paramName, this.params[paramName]);
    });

    this.getRoutes().reduce(
      (expressRouter, { method, path, middlewares, handler }) => {
        expressRouter[method](path, ...middlewares, handler);
        return expressRouter;
      },
      this.router,
    );

    Object.keys(this.routers).forEach(path => {
      const subRouter = this.routers[path].toExpress();
      this.router.use(path, subRouter);
    });

    return this.router;
  }

  mount(app, path = '/') {
    return app.use(path, this.toExpress());
  }
}

['get', 'post', 'put', 'patch', 'delete', 'head'].forEach(method => {
  Router.route[method] = definition =>
    Router.route({
      ...definition,
      method,
    });
});

export default Router;
