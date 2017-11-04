import LoggerModule from 'oors-logger/src/index';
import RouterModule from 'oors-router/src/index';
import MongoDBModule from 'oors-mongodb/src/index';
import GQLModule from 'oors-graphql/src/index';
import MailerModule from 'oors-mailer/src/index';
import FileStorageModule from 'oors-file-storage/src/index';
import HealthModule from 'oors-health/src/index';
import UserModule from 'oors-user/src/index';
import notifier from 'node-notifier';
import chalk from 'chalk';
import expressReactViews from 'express-react-views';
import Application from 'oors/build/libs/Application';
import * as middlewares from 'oors/build/middlewares';

class StandardApplication extends Application {
  static async loadMiddlewares(config) {
    return [
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
  }

  static async loadModules(config) {
    return [
      new LoggerModule(await config.get('modules.logger')),
      new MongoDBModule(await config.get('modules.mongodb')),
      new MailerModule(await config.get('modules.mailer')),
      new FileStorageModule(await config.get('modules.fileStorage')),
      new HealthModule(await config.get('modules.health')),
      new GQLModule(await config.get('modules.gql')),
      new RouterModule(await config.get('modules.router')),
      new UserModule(await config.get('modules.user')),
    ];
  }

  constructor(config, settings) {
    super(settings);

    this.config = config;
    this.setupViews();
  }

  async load() {
    return Promise.all([
      this.constructor
        .loadMiddlewares(this.config)
        .then(middlewaresList => this.addMiddlewares(...middlewaresList)),
      this.constructor.loadModules(this.config).then(modules => this.addModules(...modules)),
    ]);
  }

  setupViews() {
    this.set('views', `${__dirname}/../views`);
    this.set('view engine', 'js');
    this.engine('jsx', expressReactViews.createEngine());
  }

  addMiddlewares(...middlewaresList) {
    this.middlewares.push(...middlewaresList);
  }

  addModules(...modules) {
    this.modules.add(modules);
  }

  async listen(port) {
    const startTime = Date.now();
    await this.load();
    const result = await Application.prototype.listen.call(
      this,
      port || (await this.config.get('port')),
    );
    const message = `Server started on port ${port} in ${Date.now() - startTime}ms!`;

    if (this.isDev) {
      notifier.notify({
        title: 'oors App',
        message,
        sound: true,
      });
    }

    console.log(chalk.bgBlue.white(message));

    return result;
  }
}

export default StandardApplication;
