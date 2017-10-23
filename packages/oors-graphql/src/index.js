/* eslint-disable no-empty */
import path from 'path';
import fse from 'fs-extra';
import Joi from 'joi';
import get from 'lodash/get';
import set from 'lodash/set';
import has from 'lodash/has';
import identity from 'lodash/identity';
import { Module } from 'oors';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import merge from 'lodash/merge';
import { makeExecutableSchema } from 'graphql-tools';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import { express as playgroundMiddleware } from 'graphql-playground/middleware';
import mainResolvers from './graphql/resolvers';
import modulesResolvers from './graphql/modulesResolvers';
import LoadersMap from './libs/LoadersMap';

class Gql extends Module {
  static configSchema = {
    graphiql: Joi.object()
      .keys({
        enabled: Joi.boolean().required(),
        params: Joi.object()
          .keys({
            endpointURL: Joi.string().default('/graphql'),
            subscriptionsEndpoint: Joi.string().required(),
          })
          .required(),
      })
      .default({
        enabled: true,
        params: {
          endpointURL: '/graphql',
        },
      }),
    voyager: Joi.object()
      .keys({
        enabled: Joi.boolean().required(),
        params: Joi.object()
          .keys({
            endpointURL: Joi.string().required(),
          })
          .required(),
      })
      .default({
        enabled: true,
        params: {
          endpointURL: '/graphql',
        },
      }),
    playground: Joi.object()
      .keys({
        enabled: Joi.boolean().required(),
        params: Joi.object()
          .keys({
            endpointURL: Joi.string().required(),
          })
          .required(),
      })
      .default({
        enabled: true,
        params: {
          endpointURL: '/graphql',
        },
      }),
    middlewarePivot: Joi.string().default('isMethod'),
    configureSchema: Joi.func().default(identity),
    exposeModules: Joi.boolean().default(true),
    subscriptions: Joi.object()
      .keys({
        enabled: Joi.boolean().default(true),
        path: Joi.string().default('/subscriptions'),
        createPubSub: Joi.func().required(),
      })
      .default({
        enabled: true,
        path: '/subscriptions',
        createPubSub: () => Promise.resolve(new PubSub()),
      }),
  };

  name = 'oors.graphQL';
  typeDefs = [];
  resolvers = mainResolvers;
  middlewares = []; // for resolvers
  gqlContext = {};
  pubsub = undefined;
  loaders = new LoadersMap();

  constructor(...args) {
    super(...args);
    this.collectFromModule = this.collectFromModule.bind(this);
    this.addTypeDefs = this.addTypeDefs.bind(this);
    this.addTypeDefsByPath = this.addTypeDefsByPath.bind(this);
    this.addResolvers = this.addResolvers.bind(this);
    this.addMiddleware = this.addMiddleware.bind(this);
    this.addLoader = this.addLoader.bind(this);
  }

  async setup({ exposeModules, subscriptions }, manager) {
    if (subscriptions.enabled) {
      this.pubsub = await subscriptions.createPubSub(manager);
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
    } = this;

    await this.createHook('load', collectFromModule, {
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

    await this.createHook('buildContext', () => {}, {
      context: this.gqlContext,
    });

    const schema = this.buildSchema({ logger });

    this.setupSubscriptionServer(schema);

    this.app.middlewares.insertBefore(
      this.getConfig('middlewarePivot'),
      this.getGraphQLMiddleware(schema),
      this.getGraphiQLMiddleware(),
      this.getVoyagerMiddleware(),
      this.getPlaygroundMiddleware(),
    );

    this.export({
      schema,
      loaders,
      addMiddleware,
      addLoader,
    });
  }

  addTypeDefs(typeDefs) {
    this.typeDefs.push(typeDefs);
  }

  addResolvers(resolvers) {
    merge(this.resolvers, resolvers);
  }

  addMiddleware(matcher, middleware) {
    this.middlewares.push({
      matcher: typeof matcher === 'string' ? new RegExp(`^${matcher}$`) : matcher,
      middleware,
    });

    return this;
  }

  addLoader(...args) {
    this.loaders.add(...args);
  }

  async addTypeDefsByPath(filePath) {
    this.addTypeDefs(await fse.readFile(filePath, 'utf8'));
  }

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
      const resolvers = require(`${dirPath}/resolvers.js`);
      if (resolvers.default) {
        Object.assign(resolvers, resolvers.default);
        delete resolvers.default;
      }
      this.addResolvers(resolvers);
    } catch (err) {}
  }

  async collectFromModule(module) {
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
  }

  buildSchema({ logger }) {
    const resolvers = this.resolvers;

    this.applyMiddlewares(resolvers);

    return makeExecutableSchema(
      this.getConfig('configureSchema')({
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
    const server = this.app.server;
    const subscriptionServer = new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
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

export default Gql;
