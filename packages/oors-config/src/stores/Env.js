import toPath from 'lodash/toPath';
import toUpper from 'lodash/toUpper';
import snakeCase from 'lodash/snakeCase';
import BaseStore from './Base';

class EnvStore extends BaseStore {
  constructor(prefix) {
    super();
    this.prefix = prefix;
    this.backend = process.env;
    this.keys = Object.keys(this.backend);
  }

  makeKey(key) {
    const finalPath = toPath(key)
      .map(item => toUpper(snakeCase(item)))
      .join('_');
    return this.prefix ? `${this.prefix}_${finalPath}` : finalPath;
  }

  has(key) {
    return this.keys.includes(this.makeKey(key));
  }

  hasDeep(key) {
    const regex = new RegExp(`^${this.makeKey(key)}_`);
    return !!this.keys.find(ownKey => regex.test(ownKey));
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

    // was already fetched by super.get
    if (this.has(key)) {
      return value;
    }

    // check if it embeds the key
    if (this.hasDeep(key)) {
      return this.deepMerge(key, value);
    }

    return value;
  }

  deepMerge(prefix, value) {
    if (!this.isMergeable(value)) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => {
        const key = `${prefix}[${index}]`;
        if (this.has(key)) {
          return this.getBackendValueFor(key);
        }

        if (this.isMergeable(item)) {
          return this.deepMerge(key, item);
        }

        return item;
      });
    }

    return Object.keys(value).reduce((acc, subKey) => {
      const key = `${prefix}.${subKey}`;
      let subValue = value[subKey];

      if (this.has(key)) {
        subValue = this.getBackendValueFor(key);
      }

      if (this.isMergeable(value[subKey])) {
        subValue = this.deepMerge(key, value[subKey]);
      }

      return {
        ...acc,
        [subKey]: subValue,
      };
    }, {});
  }
}

export default EnvStore;
