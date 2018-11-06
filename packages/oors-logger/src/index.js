/* eslint-disable no-console */
import path from 'path';
import Table from 'cli-table';
import { inspect } from 'util';
import { Module } from 'oors';
import * as winston from 'winston';

class LoggerModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        default: 'info',
      },
      printModules: {
        type: 'boolean',
        default: true,
      },
      printDependencyGraph: {
        type: 'boolean',
        default: true,
      },
      printMiddlewares: {
        type: 'boolean',
        default: true,
      },
      logger: {
        type: 'object',
      },
      logsDir: {
        type: 'string',
      },
      logGqlErrors: {
        type: 'boolean',
        default: true,
      },
    },
    required: ['logsDir'],
  };

  name = 'oors.logger';

  setup({
    printModules,
    printDependencyGraph,
    printMiddlewares,
    logsDir,
    level: defaultLevel,
    logGqlErrors,
  }) {
    const transports = [
      new winston.transports.File({
        level: 'error',
        filename: path.join(logsDir, 'errors.log'),
        maxsize: 5000000,
        maxFiles: 10,
        tailable: true,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ];

    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }

    const logger = this.getConfig(
      'logger',
      winston.createLogger({
        defaultLevel,
        transports,
        exceptionHandlers: [
          new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 5000000,
            maxFiles: 10,
            tailable: true,
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        ],
      }),
    );

    process.on('unhandledRejection', reason => logger.error(reason));

    this.export({
      logger,
      log: (...args) => logger.log(...args),
      ...Object.keys(logger.levels)
        .filter(level => logger.levels[level] <= logger.levels[logger.level])
        .reduce(
          (acc, level) => ({
            ...acc,
            [level]: (message, meta) =>
              logger[level](message, {
                meta,
              }),
          }),
          {},
        ),
      logError: this.logError,
    });

    if (printModules) {
      this.printModules();
    }

    if (printDependencyGraph) {
      this.printDependencyGraph();
    }

    if (printMiddlewares) {
      this.printMiddlewares();
    }

    if (logGqlErrors) {
      this.onModule('oors.graphql', 'error', error => {
        this.logError(error);
      });
    }
  }

  get logger() {
    return this.get('logger');
  }

  printModules() {
    const modulesTable = new Table({
      head: ['Modules'],
    });

    this.on('module:loaded', module => {
      modulesTable.push([module.name]);
    });

    this.app.once('after:boot', () => {
      console.log(modulesTable.toString());
    });
  }

  printDependencyGraph() {
    this.app.once('after:boot', () => {
      console.log(this.manager.expandedDependencyGraph);
    });
  }

  printMiddlewares() {
    this.app.once('after:boot', () => {
      const table = new Table({
        head: ['Id', 'Path', 'Params'],
      });

      this.app.middlewares.reject({ enabled: false }).forEach(({ path: mPath, id, params }) => {
        table.push([id, mPath || '/', typeof params !== 'undefined' ? inspect(params) : 'N/A']);
      });

      console.log(table.toString());
    });
  }

  logError = error => this.logger.error(error.message, { meta: { error } });
}

export { LoggerModule as default };
