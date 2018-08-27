import set from 'lodash/set';
import get from 'lodash/get';
import has from 'lodash/has';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import invariant from 'invariant';
import { MongoClient, ObjectID } from 'mongodb';
import path from 'path';
import glob from 'glob';
import { Module } from 'oors';
import Repository from './libs/Repository';
import * as helpers from './libs/helpers';
import idValidator from './libs/idValidator';
import * as decorators from './decorators';
import MigrationRepository from './repositories/Migration';
import Seeder from './libs/Seeder';
import withLogger from './decorators/withLogger';
import withTimestamps from './decorators/withTimestamps';
import Migration from './libs/Migration';

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
            database: {
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
      migrationsDir: {
        type: 'string',
      },
      logQueries: {
        type: 'boolean',
        default: true,
      },
      addTimestamps: {
        type: 'boolean',
        default: true,
      },
    },
    required: ['connections'],
  };

  name = 'oors.mongoDb';

  connections = {};

  repositories = {};

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
        getRepository: this.getRepository,
        toOjectId: this.toOjectId,
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

    Object.assign(repository, {
      collection: this.getConnectionDb(connectionName).collection(repository.collectionName),
      ajv: this.ajv,
      validate: this.ajv.compile(repository.schema),
      getRepository: this.getRepository,
    });

    repository.configure({
      getRepository: this.getRepository,
    });

    return repository;
  };

  addRepository = (key, repository, options = {}) => {
    const payload = {
      key,
      repository,
      options,
    };

    this.emit('repository', payload);

    set(
      this.repositories,
      payload.key,
      this.bindRepository(payload.repository, options.connectionName),
    );

    return this.getRepository(payload.key);
  };

  getRepository = key => {
    if (!has(this.repositories, key)) {
      throw new Error(`Unable to find "${key}" repository!`);
    }

    return get(this.repositories, key);
  };

  createConnection = async ({ name, url, options }) => {
    this.connections[name] = await MongoClient.connect(
      url,
      options,
    );
    return this.connections[name];
  };

  getConnectionDb = (name = this.defaultConnectionName) => {
    const connection = this.getConnection(name);
    const { database, url } = this.getConfig('connections').find(
      ({ name: _name }) => _name === name,
    );
    return connection.db(database || url.substr(url.lastIndexOf('/') + 1));
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

  closeConnection = name => this.getConnection(name).close();

  initialize({ connections, defaultConnection }) {
    this.defaultConnectionName = defaultConnection || connections[0].name;

    const names = connections.map(({ name }) => name);

    if (!names.includes(this.defaultConnectionName)) {
      throw new Error(
        `Default connection name - "(${
          this.defaultConnectionName
        })" - can't be found through the list of available connections (${names})`,
      );
    }
  }

  async setup({ connections, logQueries, addTimestamps }) {
    await Promise.all(connections.map(this.createConnection));

    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      async: 'es7',
      useDefaults: true,
    });

    ajvKeywords(this.ajv, 'instanceof');

    this.ajv.addKeyword('isId', idValidator);

    this.addRepository('Migration', new MigrationRepository());

    const seeder = new Seeder();
    const seeds = {};

    await Promise.all([
      this.runHook('configureSeeder', () => {}, {
        seeder,
        getRepository: this.getRepository,
      }),
      this.runHook('loadSeedData', () => {}, {
        seeds,
      }),
    ]);

    if (Object.keys(seeds).length) {
      await this.seed(seeds);
    }

    this.onModule(this.name, 'repository', ({ repository }) => {
      if (logQueries) {
        withLogger()(repository);
      }

      if (addTimestamps) {
        withTimestamps()(repository);
      }
    });

    this.export({
      seeder,
    });

    this.exportProperties([
      'createConnection',
      'closeConnection',
      'getConnection',
      'getConnectionDb',
      'createStore',
      'createRepository',
      'bindRepository',
      'bindRepositories',
      'addRepository',
      'getRepository',
      'migrate',
      'ajv',
      'seed',
      'seeds',
      'toOjectId',
    ]);
  }

  migrate = async () => {
    const migrationsDir = this.getConfig('migrationsDir');
    if (!migrationsDir) {
      throw new Error(
        `Missing migrations directory! Please provide a "migrationsDir" configuration 
        directive where your migration files are located.`,
      );
    }

    this.emit('migration:before');

    const db = this.getConnectionDb();

    const migrationFiles = await new Promise((resolve, reject) => {
      glob(path.join(migrationsDir, '*.js'), (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });

    if (!migrationFiles.length) {
      throw new Error(
        `No migration files have been found in the migrations directory ("${migrationsDir}")!`,
      );
    }

    const lastDbMigration = await this.getRepository('Migration').findOne({
      options: {
        sort: [['timestamp', '-1']],
      },
    });

    const lastDbMigrationTimestamp = lastDbMigration ? lastDbMigration.timestamp : 0;

    return migrationFiles
      .filter(file => helpers.getTimestampFromMigrationFile(file) > lastDbMigrationTimestamp)
      .reduce((promise, file) => {
        const timestamp = helpers.getTimestampFromMigrationFile(file);
        const MigrationClass = require(file).default; // eslint-disable-line import/no-dynamic-require, global-require
        const migration = new MigrationClass(this.app, db);

        return promise.then(() =>
          migration.up().then(() =>
            this.getRepository('Migration').createOne({
              timestamp,
              name: migration.name,
            }),
          ),
        );
      }, Promise.resolve());
  };

  seed = data => this.get('seeder').load(data);

  toOjectId = value => new ObjectID(value);
}

export { MongoDB as default, Repository, helpers, decorators, Migration };
