/* eslint-disable class-methods-use-this */
import invariant from 'invariant';
import MemoryCache from './cache/Memory';
import * as stores from './stores';
import * as caches from './cache';

class Config {
  static notFoundValue = () => {};

  constructor(cache = new MemoryCache()) {
    this.stores = [];
    this.cache = cache;
  }

  addStore(store) {
    const nextStore = this.stores[0] || {
      get: () => this.constructor.notFoundValue,
    };

    this.stores.unshift({
      get: key => store.get(key, nextStore),
    });
  }

  async multiGet(keys, ttl) {
    invariant(
      Array.isArray(keys),
      'Config.multiGet requires an array of keys!',
    );
    return Promise.all(keys.map(key => this.get(key, undefined, ttl)));
  }

  async get(key, defaultValue, ttl) {
    invariant(key, 'Key is required!');

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = await this.stores[0].get(key);

    if (value === this.constructor.notFoundValue) {
      return defaultValue;
    }

    this.cache.set(key, value, ttl);

    return value;
  }

  clearCache(key) {
    if (key) {
      this.cache.remove(key);
    } else {
      this.cache.clear();
    }
  }
}

export { Config as default, stores, caches };
