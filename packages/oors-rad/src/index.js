import { Module } from 'oors';
import glob from 'glob';
import fse from 'fs-extra';
import path from 'path';
import set from 'lodash/set';
import get from 'lodash/get';
import has from 'lodash/has';

class RADModule extends Module {
  name = 'oors.rad';

  services = {};

  hooks = {
    'oors.graphQL.buildContext': ({ context }) => {
      Object.assign(context, {
        getService: this.getService,
      });
    },
  };

  async setup() {
    await this.runHook('load', this.collectFromModule);

    this.exportProperties(['setService', 'getService']);
  }

  collectFromModule = async module => {
    if (!module.getConfig('autoloadServices', false)) {
      return;
    }

    try {
      if (has(module, 'services')) {
        this.registerModuleServices(module.name, module.services);
      } else {
        await this.loadFromModule(module);
      }
    } catch (err) {
      throw err;
    }
  };

  registerModuleServices = (moduleName, services) => {
    Object.keys(services).forEach(serviceKey => {
      this.setService(`${moduleName}.${serviceKey}`, services[serviceKey]);
    });
  };

  async loadFromModule(module) {
    const dirPath = path.resolve(path.dirname(module.filePath), 'services');

    try {
      const stat = await fse.stat(dirPath);
      const isDirectory = stat && stat.isDirectory();
      if (!isDirectory) {
        return false;
      }
    } catch (err) {
      return false;
    }

    return new Promise((resolve, reject) => {
      glob(path.resolve(dirPath, '**/*.js'), { nodir: true }, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        files.forEach(file => {
          const Service = require(file).default; // eslint-disable-line global-require, import/no-dynamic-require
          const service = new Service(this);
          this.setService(
            `${module.name}.${service.name}`,
            Object.assign(service, {
              getService: this.getService,
            }),
          );
        });

        resolve(true);
      });
    });
  }

  setService = (servicePath, service) => set(this.services, servicePath, service);

  getService = servicePath => get(this.services, servicePath);
}

export default RADModule;
