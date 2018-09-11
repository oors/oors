/* eslint-disable no-empty */
import glob from 'glob';
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
  attachDirectiveResolvers,
} from 'graphql-tools';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import { importSchema } from 'graphql-import';
import { Binding } from 'graphql-binding';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import ConstraintDirective from 'graphql-constraint-directive';
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';
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
      depthLimit: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            default: 10,
          },
          options: {
            type: 'object',
            properties: {
              ignore: {
                type: 'array',
                default: [],
              },
            },
          },
          callback: {
            instanceof: 'Function',
          },
        },
        default: {},
      },
      complexityLimit: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            default: 1000,
          },
          options: {
            type: 'object',
            default: {},
          },
        },
        default: {},
      },
    },
  };

  name = 'oors.graphql';

  initialize() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      async: 'es7',
      useDefaults: true,
    });
    ajvKeywords(this.ajv, 'instanceof');

    this.typeDefs = [];
    this.directives = {
      constraint: ConstraintDirective,
    };
    this.resolvers = mainResolvers;
    this.resolverMiddlewares = [];
    this.pubsub = this.getConfig('pubsub', new PubSub());
    this.gqlContext = {
      pubsub: this.pubsub,
      ajv: this.ajv,
    };
    this.loaders = new LoadersMap();
    this.contextExtenders = [];
    this.formatters = {
      params: [],
      error: [],
      response: [],
    };
  }

  async setup() {
    await this.runHook(
      'load',
      this.collectFromModule,
      pick(this, [
        'pubsub',
        'addTypeDefs',
        'addDirectives',
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
      'formatters',
    ]);

    this.export({
      context: this.gqlContext,
      addSchemaResolvers: rootResolveFunction =>
        addSchemaLevelResolveFunction(this.schema, rootResolveFunction),
      addDirectivesResolvers: directivesResolvers =>
        attachDirectiveResolvers(this.schema, directivesResolvers),
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
      `Invalid context extender! Needs to be either a function or a an object that will get 
      assigned to the context.`,
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

  addDirectives = directives => {
    Object.assign(this.directives, directives);
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
      const stats = await fse.stat(dirPath);
      const isDirectory = stats && stats.isDirectory();
      if (!isDirectory) {
        return;
      }
    } catch (err) {
      return;
    }

    try {
      // try to load /graphql/typeDefs/**/*.graphl
      const typeDefsDirPath = path.join(dirPath, 'typeDefs');
      const stats = await fse.stat(typeDefsDirPath);
      if (stats.isDirectory()) {
        await new Promise((resolve, reject) => {
          glob(path.resolve(typeDefsDirPath, '**/*.graphql'), { nodir: true }, (err, filePaths) => {
            if (err) {
              return reject(err);
            }

            return resolve(
              Promise.all(filePaths.map(filePath => this.addTypeDefsByPath(filePath))),
            );
          });
        });
      }
    } catch {
      // try to load /graphql/typeDefs.graphl
      try {
        await this.addTypeDefsByPath(path.join(dirPath, 'typeDefs.graphql'));
      } catch {}
    }

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
        inheritResolversFromInterfaces: true,
        schemaDirectives: this.directives,
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
      formatError: this.format('error'),
      formatParams: this.format('params'),
      formatResponse: this.format('response'),
      schema: this.schema,
      debug: true,
      tracing: true,
      cacheControl: true,
      subscriptions: true,
      introspection: true,
      mocks: false,
      persistedQueries: true,
      validationRules: [
        depthLimit(
          this.getConfig('depthLimit.limit'),
          this.getConfig('depthLimit.options'),
          this.getConfig('depthLimit.callback'),
        ),
        createComplexityLimitRule(
          this.getConfig('complexityLimit.limit'),
          this.getConfig('complexityLimit.options'),
        ),
      ],
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
      ajv: this.ajv,
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

  format = type => {
    invariant(Array.isArray(this.formatters[type]), `Unknown formatter type - ${type}!`);
    return arg => this.formatters[type].reduce((acc, formatter) => formatter(acc), arg);
  };
}

export { Gql as default, decorators };
export { default as Resolvers } from './libs/Resolvers';
