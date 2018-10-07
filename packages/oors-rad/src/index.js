import pluralize from 'pluralize';
import { Module } from 'oors';
import camelCase from 'lodash/camelCase';
import glob from 'glob';
import fse from 'fs-extra';
import path from 'path';
import { createLoaders } from 'oors-mongodb/build/libs/graphql';

class RADModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      autoloadServices: {
        type: 'boolean',
        default: true,
      },
      autoCreateLoaders: {
        type: 'boolean',
        default: true,
      },
    },
  };

  name = 'oors.rad';

  services = {};

  hooks = {
    'oors.graphql.buildContext': ({ context }) => {
      Object.assign(context, {
        getService: this.getService,
        getModule: name => this.app.modules.get(name),
      });
    },
  };

  async setup({ autoCreateLoaders }) {
    const dependencies = [];
    if (autoCreateLoaders) {
      dependencies.push('oors.graphql', 'oors.mongodb');
    }

    await this.loadDependencies(dependencies);

    await this.runHook('load', this.collectFromModule);

    this.exportProperties(['registerModuleService', 'setService', 'getService', 'getLoadersName']);

    if (autoCreateLoaders) {
      const { loaders } = this.deps['oors.graphql'];
      this.on('module:oors.mongodb:repository', ({ repository, key }) => {
        this.deps['oors.graphql'].addLoaders(createLoaders(repository), this.getLoadersName(key));
      });
      this.export({
        getLoaders: repositoryName => loaders[this.getLoadersName(repositoryName)],
      });
    }
  }

  collectFromModule = async module => {
    if (!module.getConfig('oors.rad.autoload', this.getConfig('autoloadServices'))) {
      return;
    }

    await this.loadModuleServices(module);
  };

  async loadModuleServices(module) {
    const dirPath = path.resolve(path.dirname(module.filePath), 'services');

    try {
      const stat = await fse.stat(dirPath);
      const isDirectory = stat && stat.isDirectory();
      if (!isDirectory) {
        return;
      }
    } catch (err) {
      return;
    }

    await new Promise((resolve, reject) => {
      glob(path.resolve(dirPath, '*.js'), { nodir: true }, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        files.forEach(file => {
          const Service = require(file).default; // eslint-disable-line global-require, import/no-dynamic-require
          const service = new Service(module);
          if (!service.name) {
            throw new Error(`Unable to register a service without a name! ${service}`);
          }
          this.registerModuleService(module, service);
        });

        resolve();
      });
    });
  }

  registerModuleService(module, service) {
    this.setService(`${module.name}.${service.name}`, service);
  }

  setService = (key, service) => {
    this.services[key] = Object.assign(service, {
      getService: this.getService,
    });
  };

  getService = key => this.services[key];

  getLoadersName = repositoryName => pluralize(camelCase(repositoryName));
}

export default RADModule;
