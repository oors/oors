import { Module } from 'oors';
import glob from 'glob';
import path from 'path';

class AutoloaderModule extends Module {
  static schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  name = 'oors.autoloader';

  filesTree = {};

  async setup() {
    // await this.runHook('scan', module => this.scan(module, '**/*.js'));

    this.export({
      wrap: module =>
        ['glob', 'import', 'hasPath', 'relative'].reduce(
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

  scan = async (module, pattern = '**/*.js', options) => {
    if (!this.filesTree[module.name]) {
      this.filesTree[module.name] = await this.glob(module, pattern, options);
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

  hasPath = (module, searchedPath) => this.filesTree[module][searchedPath];
}

export default AutoloaderModule;
