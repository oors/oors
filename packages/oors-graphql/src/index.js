/* eslint-disable no-empty */
import path from 'path';
import fse from 'fs-extra';
import get from 'lodash/get';
import has from 'lodash/has';
import pick from 'lodash/pick';
import isPlainObject from 'lodash/isPlainObject';
import invariant from 'invariant';
import identity from 'lodash/identity';
import { Module } from 'oors';
import { PubSub } from 'graphql-subscriptions';
import merge from 'lodash/merge';
import {
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  mergeSchemas,
  addResolveFunctionsToSchema,
  addSchemaLevelResolveFunction,
} from 'graphql-tools';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import { importSchema } from 'graphql-import';
import { Binding } from 'graphql-binding';
import mainResolvers from './graphql/resolvers';
import modulesResolvers from './graphql/modulesResolvers';
import LoadersMap from './libs/LoadersMap';
import * as decorators from './decorators';
import Server from './libs/Server';

class Gql extends Module {
  static schema = {
    type: 'object',
    properties: {
      voyager: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
          },
          params: {
            type: 'object',
            properties: {
              endpointURL: {
                type: 'string',
                default: '/graphql',
              },
            },
            default: {},
          },
        },
        default: {},
      },
      middlewarePivot: {
        type: 'string',
        default: 'isMethod',
      },
      configureSchema: {
        instanceof: 'Function',
      },
      exposeModules: {
        type: 'boolean',
        default: true,
      },
      serverOptions: {
        type: 'object',
        default: {},
      },
      pubsub: {
        type: 'object',
      },
    },
  };

  name = 'oors.graphQL';
  typeDefs = [];
  resolvers = mainResolvers;
  resolverMiddlewares = [];
  gqlContext = {};
  pubsub = undefined;
  loaders = new LoadersMap();
  contextExtenders = [];
  formatters = {
    params: [],
    error: [],
    response: [],
  };

  async setup() {
    this.pubsub = this.getConfig('pubsub', new PubSub());

    Object.assign(this.gqlContext, {
      pubsub: this.pubsub,
    });

    await this.runHook(
      'load',
      this.collectFromModule,
      pick(this, [
        'pubsub',
        'addTypeDefs',
        'addTypeDefsByPath',
        'addResolvers',
        'addResolverMiddleware',
        'addLoader',
      ]),
    );

    if (this.getConfig('exposeModules')) {
      this.addResolvers(modulesResolvers);
      await this.addTypeDefsByPath(path.resolve(__dirname, './graphql/modulesTypeDefs.graphql'));
    }

    await this.runHook('buildContext', () => {}, {
      context: this.gqlContext,
    });

    this.schema = await this.buildSchema();
    this.server = this.buildServer();

    this.applyMiddlewares(this.server);

    const binding = this.bindSchema(this.schema);

    this.exportProperties([
      'extendContext',
      'schema',
      'server',
      'loaders',
      'addResolverMiddleware',
      'addLoader',
      'addLoaders',
      'addResolvers',
      'importSchema',
      'bindSchema',
      'binding',
      'setupListen',
      'pubsub',
    ]);

    this.export({
      context: this.gqlContext,
      addSchemaResolvers: rootResolveFunction =>
        addSchemaLevelResolveFunction(this.schema, rootResolveFunction),
    });

    this.on('after:setup', () => {
      Object.assign(this.gqlContext, {
        binding,
      });
    });
  }

  extendContext = extender => {
    invariant(
      typeof extender === 'function' || isPlainObject(extender),
      'Invalid context extender! Needs to be either a function or a an object that will get assigned to the context.',
    );
    this.contextExtenders.push(extender);
    return this.contextExtenders;
  };

  bindSchema = (schema, options = {}) =>
    new Binding({
      schema,
      ...options,
    });

  addTypeDefs = typeDefs => {
    this.typeDefs.push(typeDefs);
  };

  addResolvers = resolvers => {
    if (this.schema) {
      addResolveFunctionsToSchema({ schema: this.schema, resolvers });
    } else {
      merge(this.resolvers, resolvers);
    }
  };

  addResolverMiddleware = (matcher, middleware) => {
    this.resolverMiddlewares.push({
      matcher: typeof matcher === 'string' ? new RegExp(`^${matcher}$`) : matcher,
      middleware,
    });

    return this;
  };

  addLoader = (...args) => {
    this.loaders.add(...args);
  };

  addLoaders = (...args) => {
    this.loaders.multiAdd(...args);
  };

  addTypeDefsByPath = async filePath => {
    this.addTypeDefs(await fse.readFile(filePath, 'utf8'));
  };

  importSchema = schemaPath => {
    this.addTypeDefs(importSchema(schemaPath));
  };

  async loadFromDir(dirPath) {
    try {
      const stat = await fse.stat(dirPath);
      const isDirectory = stat && stat.isDirectory();
      if (!isDirectory) {
        return;
      }
    } catch (err) {
      return;
    }

    try {
      await this.addTypeDefsByPath(path.join(dirPath, 'typeDefs.graphql'));
    } catch (err) {}

    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const resolvers = require(`${dirPath}/resolvers`);
      if (resolvers.default) {
        Object.assign(resolvers, resolvers.default);
        delete resolvers.default;
      }
      this.addResolvers(resolvers);
    } catch (err) {}
  }

  collectFromModule = async module => {
    if (!module.getConfig('graphql.autoload', true)) {
      return;
    }

    try {
      if (has(module, 'graphql')) {
        this.addTypeDefs(get(module, 'graphql.typeDefs', ''));
        this.addResolvers(get(module, 'graphql.resolvers', {}));
        if (has(module, 'graphql.typeDefsPath')) {
          await this.addTypeDefsByPath(get(module, 'graphql.typeDefsPath'));
        }
      } else {
        await this.loadFromDir(path.resolve(path.dirname(module.filePath), 'graphql'));
      }
    } catch (err) {}
  };

  buildSchema = async () => {
    const schema = makeExecutableSchema(
      this.getConfig('configureSchema', identity)({
        typeDefs: this.typeDefs,
        resolvers: this.applyResolversMiddlewares(this.resolvers),
        logger: {
          log: err => {
            this.emit('error', err);
          },
        },
        allowUndefinedInResolve: false,
      }),
    );

    const schemas = (await this.runHook('getSchema', () => {}, {
      schema,
      mergeSchemas,
      makeExecutableSchema,
      makeRemoteExecutableSchema,
    })).filter(s => s);

    return schemas.length
      ? mergeSchemas({
          schemas: [schema, ...schemas],
        })
      : schema;
  };

  buildServer = (options = {}) => {
    const config = {
      context: this.buildContext,
      formatError: this.formatError,
      schema: this.schema,
      debug: true,
      tracing: true,
      cacheControl: true,
      subscriptions: true,
      introspection: true,
      mocks: false,
      persistedQueries: true,
      ...this.getConfig('serverOptions'),
      ...options,
    };

    const server = new Server(config);

    if (config.subscriptions) {
      server.installSubscriptionHandlers(this.app.server);
    }

    return server;
  };

  buildContext = async ({ req, connection }) => {
    const context = {
      app: this.app,
      ...this.gqlContext,
      loaders: this.loaders.build(),
    };

    if (req) {
      Object.assign(context, {
        ...this.contextExtenders.reduce(
          (acc, extender) => ({
            ...acc,
            ...(typeof extender === 'function'
              ? extender({ req, connection }, this.context)
              : extender),
          }),
          {},
        ),
        req,
        user: req.user,
      });
    } else {
      Object.assign(context, {
        connection,
      });
    }

    return context;
  };

  applyResolversMiddlewares(resolvers) {
    if (!this.resolverMiddlewares.length) {
      return resolvers;
    }

    return Object.keys(resolvers).reduce(
      (resolversAcc, type) => ({
        ...resolversAcc,
        [type]: Object.keys(resolvers[type]).reduce((typeAcc, field) => {
          let resolver = resolvers[type][field];
          const branch = `${type}.${field}`;
          const middlewares = this.resolverMiddlewares.filter(({ matcher }) =>
            matcher.test(branch),
          );

          if (middlewares.length) {
            resolver = [...middlewares]
              .reverse()
              .reduce((acc, { middleware }) => (...args) => middleware(...args, acc), resolver);
          }

          return {
            ...typeAcc,
            [field]: resolver,
          };
        }, {}),
      }),
      {},
    );
  }

  applyMiddlewares(server) {
    this.app.middlewares.insertBefore(
      this.getConfig('middlewarePivot'),
      this.getApolloServerMiddlewares(server),
      this.getVoyagerMiddleware(),
    );
  }

  formatError = err => {
    if (err.originalError && err.originalError.code === 'VALIDATION_ERROR') {
      Object.assign(err, {
        errors: err.originalError.errors,
      });
    }

    return err;
  };

  // eslint-disable-next-line class-methods-use-this
  getApolloServerMiddlewares(server) {
    return {
      id: 'apolloServer',
      apply: ({ app }) => {
        server.applyMiddleware({
          app,
          cors: false,
          bodyParserConfig: false,
          onHealthCheck: req => this.asyncEmit('healthCheck', req),
        });
      },
    };
  }

  getVoyagerMiddleware() {
    return {
      id: 'voyager',
      path: '/voyager',
      factory: ({ endpointURL }) => voyagerMiddleware({ endpointUrl: endpointURL }),
      params: this.getConfig('voyager.params'),
      enabled: this.getConfig('voyager.enabled'),
    };
  }
}

export { Gql as default, decorators };
export { default as Resolvers } from './libs/Resolvers';
