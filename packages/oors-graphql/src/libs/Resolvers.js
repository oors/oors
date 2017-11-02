/* eslint-disable no-underscore-dangle */
import invariant from 'invariant';
import set from 'lodash/set';

class Resolvers {
  constructor() {
    this.resolvers = {};
    this.middlewares = [];
    this.load();
  }

  addMiddleware(middleware, matcher = /.*/) {
    this.middlewares.push({
      matcher: typeof matcher === 'string' ? new RegExp(`^${matcher}$`) : matcher,
      middleware,
    });

    return this;
  }

  load() {
    Object.keys(this).forEach(propr => {
      if (typeof this[propr] === 'function' && this[propr].isResolver) {
        const { definition } = this[propr];
        this.addResolver({
          field: propr,
          ...definition,
          resolver: this[propr].bind(this),
        });
      }
    });
  }

  addResolver({ path, resolver, type, field }) {
    invariant(
      typeof resolver === 'function',
      `"resolver" has to be a function (received ${typeof resolver} instead)`,
    );

    const resolverPath = path || `${type}.${field}`;

    invariant(
      path.length,
      'Invalid resolver path. You must provide a path as either a "path" option or a "type" and "field"',
    );

    this.resolvers[resolverPath] = resolver;
  }

  dump() {
    return Object.keys(this.resolvers).reduce((acc, path) => {
      const middlewares = this.middlewares.filter(({ matcher }) => matcher.test(path));

      const resolver = middlewares
        .reverse()
        .reduce(
          (middlewaresAcc, { middleware }) => (...args) => middleware(...args, middlewaresAcc),
          this.resolvers[path],
        );

      set(acc, path, resolver);

      return acc;
    }, {});
  }
}

export default Resolvers;
