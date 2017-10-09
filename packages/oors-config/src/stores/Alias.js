import set from 'lodash/set';

class AliasStore {
  constructor(backend, aliases = {}) {
    this.backend = backend;
    this.aliases = aliases;
  }

  add(from, to) {
    if (typeof from === 'string') {
      this.aliases[from] = to;
    } else {
      this.aliases = {
        ...this.aliases,
        ...from,
      };
    }

    return this;
  }

  hasAlias(key) {
    return Object.keys(this.aliases).includes(key);
  }

  embedsAlias(key) {
    const regex = new RegExp(`^${key}\\.`);
    return Object.keys(this.aliases).find(alias => regex.test(alias));
  }

  getNestedKeys(key) {
    const regex = new RegExp(`^${key}\\.`);
    return Object.keys(this.aliases).filter(alias => regex.test(alias));
  }

  has(key) {
    return this.hasAlias(key) || this.embedsAlias(key);
  }

  getBackendValue(key) {
    return typeof key === 'string' ? this.backend.get(key) : key(this.backend);
  }

  async get(key, nextStore) {
    if (!this.has(key)) {
      return nextStore.get(key);
    }

    if (this.hasAlias(key)) {
      return this.getBackendValue(this.aliases[key]);
    }

    const value = await nextStore.get(key);

    const nestedKeys = this.getNestedKeys(key);

    if (nestedKeys.length) {
      await Promise.all(
        nestedKeys.map(async nestedKey => {
          const val = await this.getBackendValue(nestedKey);
          set(value, nestedKey.substr(key.length + 1), val);
        }),
      );
    }

    return value;
  }
}

export default AliasStore;
