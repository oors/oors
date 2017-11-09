import _ from 'lodash';
import isEmpty from 'lodash/isEmpty';
import BaseStore from './Base';

class EnvStore extends BaseStore {
  constructor(prefix) {
    super();
    this.prefix = prefix;
    this.backend = process.env;
    this.keys = Object.keys(this.backend);
  }

  makeKey(key) {
    const finalPath = _.toPath(key)
      .map(item => _.toUpper(_.snakeCase(item)))
      .join('_');
    return this.prefix ? `${this.prefix}_${finalPath}` : finalPath;
  }

  has(key) {
    return this.keys.includes(this.makeKey(key));
  }

  getBackendValueFor(key) {
    const value = this.backend[this.makeKey(key)];

    try {
      return JSON.parse(value);
    } catch (err) {
      return value;
    }
  }

  get(key, nextStore) {
    const value = super.get(key, nextStore);
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
          [key]: this.getBackendValueFor(fullKey),
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
