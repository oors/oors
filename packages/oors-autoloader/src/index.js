import { Module } from 'oors';
import minimatch from 'minimatch';
import glob from 'glob';
import path from 'path';

class AutoloaderModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      scan: {
        type: 'boolean',
        default: false,
      },
    },
    required: [],
  };

  name = 'oors.autoloader';

  filesTree = {};

  async setup({ scan }) {
    if (scan) {
      await this.runHook('scan', module => this.scan(module));
    }

    this.export({
      wrap: module =>
        ['glob', 'import', 'pathExists', 'relative', 'find'].reduce(
          (acc, method) => ({
            ...acc,
            [method]: (...args) => this[method](module, ...args),
          }),
          {
            module,
          },
        ),
    });
  }

  relative = (module, toPath) => path.resolve(path.dirname(module.filePath), toPath);

  glob = (module, pattern, options) =>
    new Promise((resolve, reject) => {
      glob(this.relative(module, pattern), options, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });

  find = async (module, pattern) =>
    (await this.scan(module)).filter(minimatch.filter(this.relative(module, pattern)));

  scan = async module => {
    if (!this.filesTree[module.name]) {
      this.filesTree[module.name] = await this.glob(module, '**/*.js');
    }

    return this.filesTree[module.name];
  };

  import = async (module, pattern, { resolveDefault = true } = {}) =>
    (await this.glob(module, pattern, {
      nodir: true,
    })).map(file => {
      const imported = require(file); // eslint-disable-line global-require, import/no-dynamic-require
      return resolveDefault ? imported.default : imported;
    });

  pathExists = async (module, pathToFind) => (await this.scan(module))[pathToFind];
}

export default AutoloaderModule;
