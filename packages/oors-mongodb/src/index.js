import { validate, validators as v } from 'easevalidation';
import invariant from 'invariant';
import { MongoClient, ObjectID } from 'mongodb';
import { Module } from 'oors';
import Repository from './libs/Repository';
import * as helpers from './libs/helpers';
import * as decorators from './decorators';
import MigrationRepository from './repositories/Migration';
import Seeder from './libs/Seeder';
import withLogger from './decorators/withLogger';
import withTimestamps from './decorators/withTimestamps';
import Migration from './libs/Migration';
import GQLQueryParser from './graphql/GQLQueryParser';
import Migrator from './libs/Migrator';

class MongoDB extends Module {
  static validateConfig = validate(
    v.isSchema({
      connections: [
        v.isRequired(),
        v.isArray(
          v.isSchema({
            name: [v.isRequired(), v.isString()],
            database: v.isAny(v.isString(), v.isUndefined()),
            url: [v.isRequired(), v.isString()],
            options: [v.isDefault({}), v.isObject()],
          }),
        ),
        v.isLength({
          min: 1,
        }),
      ],
      defaultConnection: v.isAny(v.isString(), v.isUndefined()),
      migration: [
        v.isDefault({}),
        v.isSchema({
          isEnabled: [v.isDefault(false), v.isBoolean()],
          dir: v.isAny(v.isString(), v.isUndefined()),
          isSilent: [v.isDefault(false), v.isBoolean()],
        }),
      ],
      logQueries: [v.isDefault(true), v.isBoolean()],
      addTimestamps: [v.isDefault(true), v.isBoolean()],
      seeding: [
        v.isDefault({}),
        v.isSchema({
          isEnabled: [v.isDefault(false), v.isBoolean()],
        }),
      ],
      transaction: [
        v.isDefault({}),
        v.isSchema({
          isEnabled: [v.isDefault(false), v.isBoolean()],
        }),
      ],
      autoloadRepositories: [v.isDefault(true), v.isBoolean()],
      moduleRepositoriesDir: [v.isDefault('repositories'), v.isString()],
    }),
  );

  static defaultConfig = {
    oors: {
      mongodb: {
        repositories: {
          autoload: false,
        },
      },
    },
  };

  static RELATION_TYPE = {
    ONE: 'one',
    MANY: 'many',
  };

  name = 'oors.mongodb';

  connections = {};

  relations = {};

  repositories = {};

  hooks = {
    'oors.graphql.buildContext': ({ context }) => {
      const { fromMongo, fromMongoCursor, fromMongoArray, toMongo } = helpers;

      Object.assign(context, {
        fromMongo,
        fromMongoCursor,
        fromMongoArray,
        toMongo,
        getRepository: this.getRepository,
        toObjectId: this.toObjectId,
        gqlQueryParser: this.gqlQueryParser,
      });
    },
  };

  initialize({ connections, defaultConnection, logQueries, addTimestamps }) {
    this.defaultConnectionName = defaultConnection || connections[0].name;

    const names = connections.map(({ name }) => name);

    if (!names.includes(this.defaultConnectionName)) {
      throw new Error(
        `Default connection name - "(${
          this.defaultConnectionName
        })" - can't be found through the list of available connections (${names})`,
      );
    }

    this.onModule(this.name, 'repository', ({ repository }) => {
      if (logQueries) {
        withLogger()(repository);
      }

      if (addTimestamps) {
        withTimestamps()(repository);
      }
    });
  }

  async setup({ connections }) {
    await this.loadDependencies(['oors.autoloader']);
    await Promise.all(connections.map(this.createConnection));

    await this.collectRepositories();
    this.setupMigration();
    await this.setupSeeding();

    this.gqlQueryParser = new GQLQueryParser(this);

    this.onModule('oors.graphql', 'healthCheck', async () => {
      await Promise.all(
        Object.keys(this.connections).map(async name => {
          const isConnected = await this.connections[name].isConnected();
          if (!isConnected) {
            throw new Error(`Connection closed - "${name}"!`);
          }
        }),
      );
    });

    this.exportProperties([
      'createConnection',
      'closeConnection',
      'getConnection',
      'getConnectionDb',
      'toObjectId',
      'gqlQueryParser',
      'transaction',
      'backup',
      'repositories',
      'createRepository',
      'getRepository',
      'addRepository',
      'bindRepository',
      'relations',
      'addRelation',
      'relationToLookup',
    ]);

    this.export({
      configureRelations: configure =>
        configure({
          add: this.addRelation,
          relations: this.relations,
          RELATION_TYPE: this.constructor.RELATION_TYPE,
          getRepository: this.getRepository,
        }),
    });
  }

  teardown = () =>
    Promise.all(
      Object.keys(this.connections).map(connectionName => this.closeConnection(connectionName)),
    );

  collectRepositories = async () => {
    await this.runHook('loadRepositories', this.collectFromModule, {
      createRepository: this.createRepository,
      bindRepositories: this.bindRepository,
      bindRepository: this.bindRepository,
    });
    this.configureRepositories();
  };

  collectFromModule = async module => {
    if (
      !module.getConfig(
        'oors.mongodb.repositories.autoload',
        this.getConfig('autoloadRepositories'),
      )
    ) {
      return;
    }

    await this.loadModuleRepositories(module);
  };

  async loadModuleRepositories(module) {
    const { glob } = this.deps['oors.autoloader'].wrap(module);
    const files = await glob(`${this.getConfig('moduleRepositoriesDir')}/*.js`, {
      nodir: true,
    });

    files.forEach(file => {
      const ModuleRepository = require(file).default; // eslint-disable-line global-require, import/no-dynamic-require
      const repository = new ModuleRepository();
      repository.module = module;
      const name =
        repository.name ||
        `${module.getConfig('oors.mongodb.repositories.prefix', module.name)}.${
          repository.constructor.name
        }`;

      this.addRepository(name, repository);

      module.export(`repositories.${repository.name || repository.constructor.name}`, repository);
    });
  }

  setupMigration() {
    if (!this.getConfig('migration.isEnabled')) {
      return;
    }

    const migrationRepository = this.addRepository('Migration', new MigrationRepository());

    this.migrator = new Migrator({
      migrationsDir: this.getConfig('migration.dir'),
      context: {
        modules: this.manager,
        db: this.getConnectionDb(),
      },
      MigrationRepository: migrationRepository,
      transaction: this.transaction,
      backup: this.backup,
      getRepository: this.getRepository,
      silent: this.getConfig('migration.isSilent'),
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
      seed: seeder.load,
    });
  }

  createConnection = async ({ name, url, options }) => {
    this.connections[name] = await MongoClient.connect(
      url,
      {
        ...options,
        useNewUrlParser: true,
      },
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

  extractCollectionName = relationNode =>
    relationNode.collectionName ||
    (relationNode.repositoryName &&
      this.getRepository(relationNode.repositoryName).collectionName) ||
    (relationNode.repository && relationNode.repository.collectionName);

  addRelation = ({ type, inversedType, ...args }) => {
    const from = {
      ...args.from,
      collectionName: this.extractCollectionName(args.from),
    };
    const to = {
      ...args.to,
      collectionName: this.extractCollectionName(args.to),
    };

    if (!this.relations[from.collectionName]) {
      this.relations[from.collectionName] = {};
    }

    this.relations[from.collectionName][from.name] = {
      collectionName: to.collectionName,
      localField: from.field,
      foreignField: to.field,
      type,
    };

    if (inversedType && to.name) {
      this.addRelation({
        from: to,
        to: from,
        type: inversedType,
      });
    }
  };

  relationToLookup = (collectionName, name) => ({
    from: this.relations[collectionName][name].collectionName,
    localField: this.relations[collectionName][name].localField,
    foreignField: this.relations[collectionName][name].foreignField,
    as: name,
  });

  createRepository = ({ methods = {}, connectionName, ...options }) => {
    const repository = new Repository(options);

    Object.keys(methods).forEach(methodName => {
      repository[methodName] = methods[methodName].bind(repository);
    });

    this.bindRepository(repository, connectionName);

    return repository;
  };

  bindRepository = (repository, connectionName) => {
    if (Array.isArray(repository)) {
      return repository.map(repo => this.bind(repo, connectionName));
    }

    invariant(
      repository.collectionName,
      `Missing repository collection name - ${repository.constructor.name}!`,
    );

    Object.assign(repository, {
      collection: !repository.hasCollection()
        ? this.getConnectionDb(connectionName).collection(repository.collectionName)
        : repository.collection,
      getRepository: this.getRepository,
      relationToLookup: (name, options = {}) => ({
        ...this.relationToLookup(repository.collectionName, name),
        ...options,
      }),
      getRelation: name => this.relations[repository.collectionName][name],
      hasRelation: name => this.relations[repository.collectionName][name] !== undefined,
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

    this.repositories[payload.key] = this.bindRepository(
      payload.repository,
      options.connectionName,
    );

    return this.repositories[payload.key];
  };

  addRepositories = repositories =>
    Object.keys(repositories).reduce(
      (acc, repositoryName) => ({
        ...acc,
        [repositoryName]: this.addRepository(repositoryName, repositories[repositoryName]),
      }),
      {},
    );

  getRepository = key => {
    if (!this.repositories[key]) {
      throw new Error(`Unable to find "${key}" repository!`);
    }

    return this.repositories[key];
  };

  configureRepositories = (repositories = this.repositories) => {
    Object.keys(repositories).forEach(key => {
      const repository = repositories[key];

      repository.configure({
        getRepository: this.getRepository,
      });

      Object.keys(repository.relations).forEach(relationName => {
        const { localField, foreignField, type, ...restOptions } = repository.relations[
          relationName
        ];

        this.addRelation({
          from: {
            repository,
            field: localField,
            name: relationName,
          },
          to: {
            ...restOptions,
            field: foreignField,
          },
          type,
        });
      });
    });
  };
}

export { MongoDB as default, Repository, helpers, decorators, Migration };
