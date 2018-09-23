import path from 'path';
import glob from 'glob';
import { getTimestampFromMigrationFile } from './helpers';

class Migrator {
  constructor({
    migrationsDir,
    context,
    MigrationRepository,
    transaction,
    backup,
    getRepository,
    silent = false,
  }) {
    this.migrationsDir = migrationsDir;
    this.context = context;
    this.MigrationRepository = MigrationRepository;
    this.transaction = transaction;
    this.backup = async () => {
      this.print('Starting database backup.');
      await backup();
      this.print('Database backup completed.');
    };
    this.getRepository = getRepository;
    this.silent = silent;
  }

  loadFiles = () =>
    new Promise((resolve, reject) => {
      glob(path.join(this.migrationsDir, '*.js'), (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });

  print = message => {
    if (this.silent) {
      return;
    }

    // @TODO: print timestamp
    console.log(message);
  };

  run = async () => {
    await this.backup();
    const migrationFiles = await this.loadFiles();

    if (!migrationFiles.length) {
      throw new Error(
        `No migration files were found in the migrations directory ("${this.migrationsDir}")!`,
      );
    }

    const lastDbMigration = await this.MigrationRepository.findOne({
      query: {
        error: null,
      },
      options: {
        sort: [['timestamp', '-1']],
      },
    });

    const lastDbMigrationTimestamp = lastDbMigration ? lastDbMigration.timestamp : 0;

    return migrationFiles
      .filter(file => getTimestampFromMigrationFile(file) > lastDbMigrationTimestamp)
      .reduce(
        (promise, file) => promise.then(() => this.runSingleMigration(file)),
        Promise.resolve(),
      );
  };

  runSingleMigration = async file => {
    const fileName = file.substr(file.lastIndexOf('/') + 1);
    const timestamp = fileName.substr(0, fileName.indexOf('_'));
    const MigrationClass = require(file).default; // eslint-disable-line import/no-dynamic-require, global-require
    const migration = new MigrationClass(this.context);

    try {
      await this.transaction(async () => {
        const startTime = Date.now();
        const result = await migration.up();
        const duration = Date.now() - startTime;

        this.MigrationRepository.createOne({
          timestamp,
          name: migration.name,
          result,
          duration,
        });

        this.print(`Completed migration - ${fileName}`);
      });
    } catch (error) {
      this.MigrationRepository.createOne({
        timestamp,
        name: migration.name,
        error,
      });

      this.print(`An error ocurred when running the "${fileName}" migration!`);
      throw error;
    }
  };
}

export default Migrator;
