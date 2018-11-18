import path from 'path';
import notifier from 'node-notifier';
import chalk from 'chalk';
import ExpressModule from 'oors-express';
import RADModule from 'oors-rad';
import LoggerModule from 'oors-logger';
import RouterModule from 'oors-router';
import MongoDBModule from 'oors-mongodb';
import GQLModule from 'oors-graphql';
import MailerModule from 'oors-mailer';
import UploadModule from 'oors-upload';
import HealthModule from 'oors-health';
import UserModule from 'oors-user';
import CacheModule from 'oors-cache';
import SchedulerModule from 'oors-scheduler';
import AutoloaderModule from 'oors-autoloader';
import { Application as BaseApplication } from 'oors';
import config from '../config';

if (process.env.NODE_ENV === 'development') {
  process.on('unhandledRejection', reason => console.log(reason)); // eslint-disable-line
  process.on('uncaughtException', err => console.log(err)); // eslint-disable-line
}

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

    this.addModules(
      new ExpressModule(),
      new RADModule(),
      new LoggerModule(),
      new MongoDBModule(),
      new MailerModule(),
      new UploadModule(),
      new HealthModule(),
      new GQLModule(),
      new RouterModule(),
      new UserModule(),
      new CacheModule(),
      new SchedulerModule(),
      new AutoloaderModule(),
    );
  }

  async listen(port) {
    const startTime = Date.now();
    await this.boot();
    const finalPort = port || this.config.get('port');
    const result = await this.modules.get('oors.express').listen(finalPort);
    const message = `Server started on port ${finalPort} in ${Date.now() - startTime}ms!`;

    if (process.env.NODE_ENV === 'development') {
      notifier.notify({
        title: 'oors App',
        message,
        sound: true,
      });
    }

    console.log(chalk.bgBlue.white(message)); // eslint-disable-line no-console

    return result;
  }
}

export default StandardApplication;
