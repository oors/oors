/* eslint-disable no-console */
import Table from 'cli-table';
import { inspect } from 'util';
import { Module } from 'oors';
import * as winston from 'winston';

class LoggerModule extends Module {
  static schema = {
    type: 'object',
    properties: {
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
    },
    required: [],
  };
  name = 'oors.logger';

  initialize({ printModules, printDependencyGraph, printMiddlewares, logger }) {
    this.logger =
      logger ||
      winston.createLogger({
        transports: [
          new winston.transports.Console({
            colorize: true,
            handleExceptions: true,
            humanReadableUnhandledException: true,
            json: true,
            prettyPrint: true,
            timestamp: true,
          }),
        ],
      });

    process.on('unhandledRejection', reason => this.logger.error(reason));

    this.export({
      logger: this.logger,
      log: (...args) => this.logger.log(...args),
      ...['error', 'warn', 'info', 'verbose', 'debug', 'silly'].reduce(
        (acc, level) => ({
          ...acc,
          [level]: (...args) => this.logger[level](...args),
        }),
        {},
      ),
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
}

export { LoggerModule as default };
