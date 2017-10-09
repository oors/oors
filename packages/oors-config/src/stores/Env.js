import _ from 'lodash';
import isEmpty from 'lodash/isEmpty';
import BaseStore from './Base';

class EnvStore extends BaseStore {
  static makeKey = (prefix, key) => {
    const path = _.toPath(key);
    const finalPath = path.map(item => _.toUpper(_.snakeCase(item))).join('_');
    return prefix ? `${prefix}_${finalPath}` : finalPath;
  };

  constructor(prefix) {
    super();
    this.prefix = prefix;
    this.backend = process.env;
    this.keys = Object.keys(this.backend);
  }

  has(key) {
    return this.keys.includes(EnvStore.makeKey(this.prefix, key));
  }

  getBackendValue(key) {
    const value = this.backend[EnvStore.makeKey(this.prefix, key)];

    try {
      return JSON.parse(value);
    } catch (err) {
      return value;
    }
  }

  async get(key, nextStore) {
    const value = await BaseStore.prototype.get.call(this, key, nextStore);
    const deepValue = this.getDeep(key, value);

    if (!this.has(key) && !isEmpty(deepValue)) {
      return this.merge(value, deepValue);
    }

    return value;
  }

  getDeep(prefix, value) {
    return Object.keys(value).reduce((acc, key) => {
      const fullKey = `${prefix}.${key}`;

      if (this.has(fullKey)) {
        return {
          ...acc,
          [key]: this.getBackendValue(fullKey),
        };
      }

      if (_.isPlainObject(value[key])) {
        return {
          ...acc,
          [key]: this.getDeep(fullKey, value[key]),
        };
      }

      return acc;
    }, {});
  }
}

export default EnvStore;
