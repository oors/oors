/* eslint-disable no-empty */
import path from 'path';
import fse from 'fs-extra';
import get from 'lodash/get';
import set from 'lodash/set';
import has from 'lodash/has';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import identity from 'lodash/identity';
import { Module } from 'oors';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import merge from 'lodash/merge';
import { makeExecutableSchema, makeRemoteExecutableSchema, mergeSchemas } from 'graphql-tools';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import playgroundMiddleware from 'graphql-playground-middleware-express';
import { importSchema } from 'graphql-import';
import { Binding } from 'graphql-binding';
import mainResolvers from './graphql/resolvers';
import modulesResolvers from './graphql/modulesResolvers';
import LoadersMap from './libs/LoadersMap';
import * as decorators from './decorators';

class Gql extends Module {
  static schema = {
    type: 'object',
    properties: {
      graphiql: {
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
              subscriptionsEndpoint: {
                type: 'string',
              },
            },
            default: {},
          },
        },
        default: {},
      },
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
      playground: {
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
      subscriptions: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: true,
          },
          path: {
            type: 'string',
            default: '/subscriptions',
          },
          createPubSub: {
            instanceof: 'Function',
          },
          serverOptions: {
            type: 'object',
            default: {},
          },
        },
        default: {},
      },
      getServerOptions: {
        instanceof: 'Function',
      },
    },
  };

  name = 'oors.graphQL';
  typeDefs = [];
  resolvers = mainResolvers;
  middlewares = []; // for resolvers
  gqlContext = {
    ajv: new Ajv({
      allErrors: true,
      verbose: true,
      async: 'es7',
      useDefaults: true,
    }),
  };
  pubsub = undefined;
  loaders = new LoadersMap();

  initialize() {
    ajvKeywords(this.gqlContext.ajv, 'instanceof');
  }

  async setup({ exposeModules, subscriptions }, manager) {
    const createPubSub = this.getConfig('subscriptions.createPubSub', () => new PubSub());

    if (subscriptions.enabled) {
      this.pubsub = await createPubSub(manager);
    }

    const { logger } = await this.dependency('oors.logger');
    const {
      loaders,
      collectFromModule,
      addTypeDefs,
      addTypeDefsByPath,
      addResolvers,
      addMiddleware,
      addLoader,
      addLoaders,
      bindSchema,
    } = this;

    await this.runHook('load', collectFromModule, {
      pubsub: this.pubsub,
      addTypeDefs,
      addTypeDefsByPath,
      addResolvers,
      addMiddleware,
      addLoader,
    });

    if (exposeModules) {
      this.addResolvers(modulesResolvers);
      await this.addTypeDefsByPath(path.resolve(__dirname, './graphql/modulesTypeDefs.graphql'));
    }

    await this.runHook('buildContext', () => {}, {
      context: this.gqlContext,
    });

    const schema = this.buildSchema({ logger });

    const schemas = (await this.runHook('getSchema', () => {}, {
      schema,
      mergeSchemas,
      makeExecutableSchema,
      makeRemoteExecutableSchema,
    })).filter(s => s);

    const finalSchema = schemas.length
      ? mergeSchemas({
          schemas: [schema, ...schemas],
        })
      : schema;

    this.setupSubscriptionServer(finalSchema);

    this.loadMiddlewares(finalSchema);

    this.export({
      schema: finalSchema,
      loaders,
      addMiddleware,
      addLoader,
      addLoaders,
      importSchema: this.importSchema,
      bindSchema,
      binding: this.bindSchema(finalSchema),
    });
  }

  bindSchema = (schema, options = {}) =>
    new Binding({
      schema,
      ...options,
    });

  addTypeDefs = typeDefs => {
    this.typeDefs.push(typeDefs);
  };

  addResolvers = resolvers => {
    merge(this.resolvers, resolvers);
  };

  addMiddleware = (matcher, middleware) => {
    this.middlewares.push({
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

  buildSchema({ logger }) {
    const resolvers = this.resolvers;

    this.applyMiddlewares(resolvers);

    return makeExecutableSchema(
      this.getConfig('configureSchema', identity)({
        typeDefs: this.typeDefs,
        resolvers,
        logger: {
          log: err => logger.error(err),
        },
        allowUndefinedInResolve: false,
      }),
    );
  }

  applyMiddlewares(resolvers) {
    Object.keys(resolvers).forEach(type => {
      Object.keys(resolvers[type]).forEach(field => {
        const branch = `${type}.${field}`;
        const middlewares = this.middlewares.filter(({ matcher }) => matcher.test(branch));
        if (!middlewares.length) {
          return;
        }

        const resolver = [...middlewares]
          .reverse()
          .reduce(
            (acc, { middleware }) => (...args) => middleware(...args, acc),
            get(resolvers, branch),
          );

        set(resolvers, branch, resolver);
      });
    });
  }

  setupSubscriptionServer(schema) {
    if (!this.getConfig('subscriptions.enabled')) {
      return;
    }

    const { pubsub } = this;
    const { server } = this.app;
    const subscriptionServer = new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
        onConnect: connectionParams => ({ ...connectionParams }),
        onOperation: (message, params) => ({
          ...params,
          context: {
            loaders: this.loaders.build(),
            ...this.gqlContext,
            ...(params.context || {}),
          },
        }),
        ...this.getConfig('subscriptions.serverOptions'),
      },
      {
        server,
        path: this.getConfig('subscriptions.path'),
      },
    );

    this.gqlContext.pubsub = pubsub;

    this.export({
      pubsub,
      subscriptionServer,
    });
  }

  loadMiddlewares(schema) {
    this.app.middlewares.insertBefore(
      this.getConfig('middlewarePivot'),
      this.getGraphQLMiddleware(schema),
      this.getGraphiQLMiddleware(),
      this.getVoyagerMiddleware(),
      this.getPlaygroundMiddleware(),
    );
  }

  getGraphQLMiddleware(schema) {
    return {
      id: 'graphql',
      path: '/graphql',
      factory: graphqlExpress,
      params: req => ({
        schema,
        context: {
          ...this.gqlContext,
          req,
          app: req.app,
          user: req.user,
          loaders: this.loaders.build(),
        },
        formatError: err => {
          if (err.originalError && err.originalError.code === 'VALIDATION_ERROR') {
            Object.assign(err, {
              errors: err.originalError.errors,
            });
          }

          return err;
        },
        tracing: true,
        cacheControl: true,
        ...this.getConfig('getServerOptions', () => ({}))(req),
      }),
    };
  }

  getGraphiQLMiddleware() {
    return {
      id: 'graphiql',
      path: '/graphiql',
      factory: graphiqlExpress,
      params: this.getConfig('graphiql.params'),
      enabled: this.getConfig('graphiql.enabled'),
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

  getPlaygroundMiddleware() {
    return {
      id: 'playground',
      path: '/playground',
      factory: ({ endpointURL }) => playgroundMiddleware({ endpoint: endpointURL }),
      params: this.getConfig('playground.params'),
      enabled: this.getConfig('playground.enabled'),
    };
  }
}

export { Gql as default, decorators };
export { default as Resolvers } from './libs/Resolvers';
