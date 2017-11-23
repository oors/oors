import path from 'path';
import LoggerModule from 'oors-logger';
import RouterModule from 'oors-router';
import MongoDBModule from 'oors-mongodb';
import GQLModule from 'oors-graphql';
import MailerModule from 'oors-mailer';
import FileStorageModule from 'oors-file-storage';
import HealthModule from 'oors-health';
import UserModule from 'oors-user';
import BaseApplication from './Base';
import * as middlewares from '../middlewares';
import config from '../config';

process.on('unhandledRejection', reason => console.log(reason)); // eslint-disable-line
process.on('uncaughtException', err => console.log(err)); // eslint-disable-line

class StandardApplication extends BaseApplication {
  constructor(...args) {
    super(...args);

    if (!this.config) {
      this.config = config;
    }

    const filePath = new Error().stack
      .toString()
      .split(/\r\n|\n/)[2]
      .match(/\((.*.js)/)[1];

    if (!this.config.get('rootDir')) {
      this.config.set('rootDir', path.resolve(filePath, '../..'));
    }

    this.addMiddlewares(
      middlewares.useragent,
      middlewares.cors,
      middlewares.helmet,
      middlewares.morgan,
      middlewares.compression,
      middlewares.bodyParserJSON,
      middlewares.bodyParserURLEncoded,
      middlewares.cookieParser,
      middlewares.statusMonitor,
      middlewares.isMethod,
      middlewares.validationErrorHandler,
      middlewares.boomErrorHandler,
      middlewares.errorHandler,
    );

    this.addModules(
      new LoggerModule(),
      new MongoDBModule(),
      new MailerModule(),
      new FileStorageModule(),
      new HealthModule(),
      new GQLModule(),
      new RouterModule(),
      new UserModule(),
    );
  }
}

export default StandardApplication;
