/* eslint-disable no-console */
import dotenv from 'dotenv';
import notifier from 'node-notifier';
import chalk from 'chalk';
import LoggerModule from '../../../packages/oors-logger/src/index';
import RouterModule from '../../../packages/oors-router/src/index';
import MongoDBModule from '../../../packages/oors-mongodb/src/index';
import GQLModule from '../../../packages/oors-graphql/src/index';
import MailerModule from '../../../packages/oors-mailer/src/index';
import FileStorageModule from '../../../packages/oors-file-storage/src/index';
import HealthModule from '../../../packages/oors-health/src/index';
import UserModule from '../../../packages/oors-user/src/index';
import { Application } from '../../../packages/oors/src/index';
import './env';
import CoreModule from './modules/Core';
import Config from './config';
import * as middlewares from '../../../packages/oors/src/middlewares';

dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

process.on('unhandledRejection', reason => console.log(reason)); // eslint-disable-line
process.on('uncaughtException', err => console.log(err)); // eslint-disable-line

const startTime = Date.now();
const app = new Application();

const loadMiddlewares = async config => [
  middlewares.useragent,
  middlewares.cors,
  middlewares.helmet,
  {
    ...middlewares.morgan,
    params: await config.get('morgan.format'),
    enabled: await config.get('isDev'),
  },
  {
    ...middlewares.compression,
    enabled: !await config.get('isDev'),
  },
  {
    ...middlewares.bodyParserJSON,
    params: { limit: await config.get('maxUploadSize') },
  },
  middlewares.bodyParserURLEncoded,
  {
    ...middlewares.cookieParser,
    params: {
      secret: await config.get('session.secret'),
    },
  },
  {
    ...middlewares.statusMonitor,
    enabled: true,
  },
  middlewares.isMethod,
  middlewares.validationErrorHandler,
  {
    ...middlewares.boomErrorHandler,
    params: {
      ...middlewares.boomErrorHandler.params,
      isDev: await config.get('isDev'),
    },
  },
  {
    ...middlewares.errorHandler,
    params: {
      ...middlewares.errorHandler.params,
      isDev: await config.get('isDev'),
    },
  },
];

const loadModules = async config => [
  new CoreModule(await config.get('modules.core')),
  new LoggerModule(await config.get('modules.logger')),
  new MongoDBModule(await config.get('modules.mongodb')),
  new MailerModule(await config.get('modules.mailer')),
  new FileStorageModule(await config.get('modules.fileStorage')),
  new HealthModule(await config.get('modules.health')),
  new GQLModule(await config.get('modules.gql')),
  new RouterModule(await config.get('modules.router')),
  new UserModule(await config.get('modules.user')),
];

Promise.all([loadMiddlewares(Config), loadModules(Config), Config.get('port')])
  .then(async ([middlewaresChain, modules, port]) => {
    app.middlewares.push(...middlewaresChain);
    app.modules.add(modules);
    app.listen(port).then(() => {
      const message = `Server started on port ${port} in ${Date.now() - startTime}ms!`;

      if (app.isDev) {
        notifier.notify({
          title: 'oors App',
          message,
          sound: true,
        });
      }

      console.log(chalk.bgBlue.white(message));
    });
  })
  .catch(console.log.bind(console));
