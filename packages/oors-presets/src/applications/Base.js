/* eslint-disable class-methods-use-this */
import notifier from 'node-notifier';
import chalk from 'chalk';
import expressReactViews from 'express-react-views';
import Application from 'oors/build/libs/Application';

class BaseApplication extends Application {
  constructor(config, context, settings) {
    super(context, settings);
    this.setupViews();
    this.config = config;
  }

  setupViews() {
    this.set('views', `${__dirname}/../views`);
    this.set('view engine', 'js');
    this.engine('js', expressReactViews.createEngine());
  }

  addMiddlewares(...middlewares) {
    this.middlewares.push(
      ...middlewares.map(middleware =>
        Object.assign(middleware, this.config.get(`middlewares.${middleware.id}`, {})),
      ),
    );
  }

  addModules(...modules) {
    modules.forEach(module => {
      Object.assign(module.config, this.config.get(`modules.${module.name}`, {}));
      this.modules.add(module);
    });
  }

  async listen(port) {
    const startTime = Date.now();
    const finalPort = port || this.config.get('port');

    const result = await Application.prototype.listen.call(this, finalPort);

    const message = `Server started on port ${finalPort} in ${Date.now() - startTime}ms!`;

    if (this.isDev) {
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

export default BaseApplication;
