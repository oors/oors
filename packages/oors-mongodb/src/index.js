import Joi from 'joi';
import { MongoClient } from 'mongodb';
import { RefManager } from 'mongo-dnorm';
import { Store as MongoStore, decorators } from 'octobus-mongodb-store';
import { Module } from 'oors';
import Repository from './libs/Repository';
import * as helpers from './libs/helpers';

class MongoDB extends Module {
  static configSchema = {
    connections: Joi.array().items(
      Joi.object().keys({
        name: Joi.string().required(),
        url: Joi.string().required(),
        Store: Joi.object().default(() => decorators.withTimestamps(MongoStore), 'Mongo store'),
      }),
    ),
    defaultConnection: Joi.string(),
  };

  name = 'oors.mongoDb';

  hooks = {
    'oors.graphQL.buildContext': ({ context }) => {
      const { fromMongo, fromMongoCursor, toMongo } = helpers;

      Object.assign(context, {
        fromMongo,
        fromMongoCursor,
        toMongo,
      });
    },
  };

  constructor(...args) {
    super(...args);

    this.connections = {};

    this.createStore = this.createStore.bind(this);
    this.createRepository = this.createRepository.bind(this);
    this.createConnection = this.createConnection.bind(this);
    this.getConnection = this.getConnection.bind(this);
    this.bindRepository = this.bindRepository.bind(this);
  }

  createStore(options, connectionName) {
    const { refManager, db, Store } = this.getConnection(
      connectionName || this.defaultConnectionName,
    );
    return new Store({
      db,
      refManager,
      ...options,
    });
  }

  createRepository({ name, schema, methods = {}, connectionName, store }) {
    const repository = new Repository(schema, name);
    Object.keys(methods).forEach(methodName => {
      repository[methodName] = methods[methodName].bind(repository);
    });

    if (store) {
      repository.setStore(store);
    } else {
      this.bindRepository(repository, connectionName || this.defaultConnectionName);
    }

    return repository;
  }

  createRepositories(repositories) {
    return Object.keys(repositories).reduce(
      (acc, name) => ({
        ...acc,
        [`${name}Repository`]: this.createRepository({
          name,
          ...repositories[name],
        }),
      }),
      {},
    );
  }

  bindRepository(repository, connectionName) {
    const store = this.createStore(
      {
        collectionName: repository.collectionName,
      },
      connectionName || this.defaultConnectionName,
    );

    repository.setStore(store);

    return repository;
  }

  async createConnection(options) {
    const { name, Store, url } = options;
    const db = await MongoClient.connect(url);
    const refManager = new RefManager(db);

    const connection = {
      db,
      refManager,
      Store,
    };

    this.connections[name] = connection;

    return connection;
  }

  getConnection(name) {
    if (!this.connections[name]) {
      throw new Error(`Unknown connection name - "${name}"!`);
    }

    return this.connections[name];
  }

  initialize({ connections, defaultConnection }) {
    this.defaultConnectionName = defaultConnection;

    if (!this.defaultConnectionName && connections.length === 1) {
      this.defaultConnectionName = connections[0].name;
    }

    const names = connections.map(({ name }) => name);

    if (!names.includes(this.defaultConnectionName)) {
      throw new Error(
        `Default connection name (${this
          .defaultConnectionName}) can't be found through the list of available connections (${names})`,
      );
    }
  }

  async setup({ connections }) {
    const { createConnection, getConnection, createStore, createRepository, bindRepository } = this;

    await Promise.all(connections.map(createConnection));

    this.export({
      createStore,
      createRepository,
      createConnection,
      getConnection,
      bindRepository,
    });
  }
}

export { MongoDB as default, Repository, helpers };
