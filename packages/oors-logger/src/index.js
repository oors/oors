/* eslint-disable no-console */
import Table from 'cli-table';
import { inspect } from 'util';
import { Module } from 'oors';
import path from 'path';
import { Logger, transports as loggerTransports } from 'winston';

class LoggerModule extends Module {
  static configSchema = {
    type: 'object',
    properties: {
      logsDir: {
        type: 'string',
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
    },
    required: ['logsDir'],
  };
  name = 'oors.logger';

  initialize({ logsDir, printModules, printDependencyGraph, printMiddlewares }) {
    const logger = new Logger({
      transports: [
        new loggerTransports.Console({
          colorize: true,
        }),
        new loggerTransports.File({
          filename: path.join(logsDir, 'logs.log'),
          level: 'error',
          handleExceptions: true,
          humanReadableUnhandledException: true,
        }),
      ],
    });

    process.on('unhandledRejection', reason => logger.error(reason));

    this.export({ logger });

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
