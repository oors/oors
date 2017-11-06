import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import invariant from 'invariant';
import { MongoClient } from 'mongodb';
import { Module } from 'oors';
import Repository from './Repository';
import * as helpers from './libs/helpers';
import idValidator from './libs/idValidator';

class MongoDB extends Module {
  static schema = {
    type: 'object',
    properties: {
      connections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            url: {
              type: 'string',
            },
            options: {
              type: 'object',
              default: {},
            },
          },
          required: ['name', 'url'],
        },
        minItems: 1,
      },
      defaultConnection: {
        type: 'string',
      },
    },
    required: ['connections'],
  };

  name = 'oors.mongoDb';
  connections = {};

  hooks = {
    'oors.graphQL.buildContext': ({ context }) => {
      const { fromMongo, fromMongoCursor, toMongo } = helpers;

      if (context.ajv) {
        context.ajv.addKeyword('isId', idValidator);
      }

      Object.assign(context, {
        fromMongo,
        fromMongoCursor,
        toMongo,
      });
    },
  };

  createRepository = ({ collection, schema, collectionName, methods = {}, connectionName }) => {
    const repository = new Repository({ collection, schema, collectionName });

    Object.keys(methods).forEach(methodName => {
      repository[methodName] = methods[methodName].bind(repository);
    });

    this.bindRepository(repository, connectionName);

    return repository;
  };

  bindRepositories = (repositories, connectionName) =>
    repositories.map(repository => this.bindRepository(repository, connectionName));

  bindRepository = (repository, connectionName) => {
    invariant(
      repository.collectionName,
      `Missing repository collection name - ${repository.constructor.name}!`,
    );

    const db = this.getConnection(connectionName);

    Object.assign(repository, {
      collection: db.collection(repository.collectionName),
      ajv: this.ajv,
      validate: this.ajv.compile(repository.schema),
    });

    return repository;
  };

  createConnection = async connectionOptions => {
    const { name, url, options } = connectionOptions;

    this.connections[name] = await MongoClient.connect(url, options);

    return this.connections[name];
  };

  getConnection = name => {
    if (!name) {
      return this.connections[this.defaultConnectionName];
    }

    if (!this.connections[name]) {
      throw new Error(`Unknown connection name - "${name}"!`);
    }

    return this.connections[name];
  };

  initialize({ connections, defaultConnection }) {
    this.defaultConnectionName = defaultConnection || connections[0].name;

    const names = connections.map(({ name }) => name);

    if (!names.includes(this.defaultConnectionName)) {
      throw new Error(
        `Default connection name - "(${this
          .defaultConnectionName})" - can't be found through the list of available connections (${names})`,
      );
    }
  }

  async setup({ connections }) {
    const {
      createConnection,
      getConnection,
      createStore,
      createRepository,
      bindRepository,
      bindRepositories,
    } = this;

    await Promise.all(connections.map(createConnection));

    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      async: 'es7',
      useDefaults: true,
    });

    ajvKeywords(this.ajv, 'instanceof');

    this.ajv.addKeyword('isId', idValidator);

    this.export({
      createStore,
      createRepository,
      createConnection,
      getConnection,
      bindRepository,
      bindRepositories,
      ajv: this.ajv,
    });
  }
}

export { MongoDB as default, Repository, helpers };
