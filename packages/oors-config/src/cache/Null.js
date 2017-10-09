/* eslint-disable class-methods-use-this */

class NullCache {
  set() {
    return this;
  }

  has() {
    return false;
  }

  get(key, defaultValue) {
    return defaultValue;
  }

  remove() {
    return this;
  }

  clear() {
    return this;
  }
}

export default NullCache;
