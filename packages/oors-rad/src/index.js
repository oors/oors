import pluralize from 'pluralize';
import { Module } from 'oors';
import camelCase from 'lodash/camelCase';
import fg from 'fast-glob';
import fse from 'fs-extra';
import path from 'path';
import { createLoaders } from 'oors-mongodb/build/libs/graphql';

class RADModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      autoload: {
        type: 'object',
        properties: {
          services: {
            type: 'boolean',
            default: true,
          },
          methods: {
            type: 'boolean',
            default: true,
          },
        },
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
      const { repositoryStore } = this.deps['oors.mongodb'];

      // creating loaders for repositories that have been added already
      Object.keys(repositoryStore.repositories).forEach(repositoryName => {
        this.deps['oors.graphql'].addLoaders(
          createLoaders(repositoryStore.repositories[repositoryName]),
          this.getLoadersName(repositoryName),
        );
      });

      this.onModule('oors.mongodb', 'repository', ({ repository, key }) => {
        this.deps['oors.graphql'].addLoaders(createLoaders(repository), this.getLoadersName(key));
      });

      this.export({
        getLoaders: repositoryName => loaders[this.getLoadersName(repositoryName)],
      });
    }
  }

  collectFromModule = async module => {
    const tasks = [];

    if (module.getConfig('oors.rad.autoload.services', this.getConfig('autoload.services'))) {
      tasks.push(this.loadModuleServices(module));
    }

    if (module.getConfig('oors.rad.autoload.methods', this.getConfig('autoload.methods'))) {
      tasks.push(this.loadModuleMethods(module));
    }

    if (!tasks.length) {
      return;
    }

    await Promise.all(tasks);
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

    const files = await fg(path.resolve(dirPath, '*.js'));
    const imports = await Promise.all(files.map(file => import(file)));

    imports.forEach(({ default: Service }, index) => {
      const service = new Service(module);
      if (!service.name) {
        throw new Error(
          `Unable to register a service without a name! "${files[index]}" in "${
            module.name
          }" module`,
        );
      }
      this.registerModuleService(module, service);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async loadModuleMethods(module) {
    const dirPath = path.resolve(path.dirname(module.filePath), 'methods');

    try {
      const stat = await fse.stat(dirPath);
      const isDirectory = stat && stat.isDirectory();
      if (!isDirectory) {
        return;
      }
    } catch (err) {
      return;
    }

    const files = await fg(path.resolve(dirPath, '*.js'));
    const imports = await Promise.all(files.map(file => import(file)));

    imports.forEach(({ default: method }, index) => {
      const { name } = path.parse(files[index]);

      if (typeof method !== 'function') {
        throw new Error(
          `Unable to register "${name}" method for ${module.name} module! (not a function)`,
        );
      }

      module.export(name, (...args) =>
        method.call(module, { args, module, getService: this.getService }),
      );
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
