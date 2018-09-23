import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { MongoClient, ObjectID } from 'mongodb';
import { Module } from 'oors';
import RepositoryStore from './libs/RepositoryStore';
import Repository from './libs/Repository';
import * as helpers from './libs/helpers';
import idValidator from './libs/idValidator';
import * as decorators from './decorators';
import MigrationRepository from './repositories/Migration';
import Seeder from './libs/Seeder';
import withLogger from './decorators/withLogger';
import withTimestamps from './decorators/withTimestamps';
import Migration from './libs/Migration';
import GQLQueryParser from './libs/GQLQueryParser';
import Migrator from './libs/Migrator';
import RelationsManager from './libs/RelationsManager';

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
      migration: {
        type: 'object',
        properties: {
          isEnabled: {
            type: 'boolean',
            default: false,
          },
          dir: {
            type: 'string',
          },
        },
        default: {},
      },
      logQueries: {
        type: 'boolean',
        default: true,
      },
      addTimestamps: {
        type: 'boolean',
        default: true,
      },
      seeding: {
        type: 'object',
        properties: {
          isEnabled: {
            type: 'boolean',
            default: false,
          },
        },
        default: {},
      },
      transaction: {
        type: 'object',
        properties: {
          isEnabled: {
            type: 'boolean',
            default: false,
          },
        },
        default: {},
      },
    },
    required: ['connections'],
  };

  name = 'oors.mongodb';

  connections = {};

  hooks = {
    'oors.graphql.buildContext': ({ context }) => {
      const { fromMongo, fromMongoCursor, fromMongoArray, toMongo } = helpers;

      if (context.ajv) {
        context.ajv.addKeyword('isId', idValidator);
      }

      Object.assign(context, {
        fromMongo,
        fromMongoCursor,
        fromMongoArray,
        toMongo,
        getRepository: this.get('getRepository'),
        toObjectId: this.toObjectId,
        gqlQueryParser: this.gqlQueryParser,
      });
    },
    shutdown: () => this.closeConnection(),
  };

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

    this.repositoryStore = new RepositoryStore(this);
    this.relationsManager = new RelationsManager(this);

    this.setupValidator();
    this.setupMigration();
    await this.setupSeeding();

    this.onModule(this.name, 'repository', ({ repository }) => {
      if (logQueries) {
        withLogger()(repository);
      }

      if (addTimestamps) {
        withTimestamps()(repository);
      }
    });

    this.gqlQueryParser = new GQLQueryParser(this);

    this.export({
      createRepository: this.repositoryStore.create,
      bindRepositories: this.repositoryStore.bind,
      bindRepository: this.repositoryStore.bind,
      addRepository: this.repositoryStore.add,
      getRepository: this.repositoryStore.get,
      relations: this.relationsManager.relations,
      addRelation: this.relationsManager.add,
      configureRelations: configure =>
        configure({
          add: this.relationsManager.add,
          relations: this.relationsManager.relations,
          RELATION_TYPE: this.relationsManager.constructor.RELATION_TYPE,
        }),
      relationToLookup: this.relationsManager.toLookup,
    });

    this.exportProperties([
      'createConnection',
      'closeConnection',
      'getConnection',
      'getConnectionDb',
      'repositoryStore',
      'toObjectId',
      'gqlQueryParser',
      'transaction',
      'backup',
    ]);
  }

  setupValidator() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      async: 'es7',
      useDefaults: true,
    });

    ajvKeywords(this.ajv, 'instanceof');

    this.ajv.addKeyword('isId', idValidator);

    this.exportProperties(['ajv']);
  }

  setupMigration() {
    if (!this.getConfig('migration.isEnabled')) {
      return;
    }

    const migrationRepository = this.addRepository('Migration', new MigrationRepository());

    this.migrator = new Migrator({
      migrationsDir: this.getConfig('migration.dir'),
      context: {
        app: this.app,
        db: this.getConnectionDb(),
      },
      MigrationRepository: migrationRepository,
      transaction: this.transaction,
      backup: this.backup,
    });

    this.export({
      migrate: this.migrator.run,
    });
  }

  async setupSeeding() {
    if (!this.getConfig('seeding.isEnabled')) {
      return;
    }

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

    this.export({
      seeder,
      seed: this.seeder.load,
    });
  }

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

  toObjectId = value => new ObjectID(value);

  transaction = async (cb, options = {}, connectionName) => {
    const db = this.getConnectionDb(connectionName);

    if (!this.getConfig('transaction.isEnabled')) {
      return cb(db);
    }

    const session = db.startSession();
    session.startTransaction(options);
    try {
      const result = await cb(db);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  };

  // eslint-disable-next-line
  backup = connectionName => {
    // https://github.com/theycallmeswift/node-mongodb-s3-backup
    // https://dzone.com/articles/auto-backup-mongodb-database-with-nodejs-on-server-1
  };
}

export { MongoDB as default, Repository, helpers, decorators, Migration };
