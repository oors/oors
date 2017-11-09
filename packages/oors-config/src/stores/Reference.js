import set from 'lodash/set';

class ReferenceStore {
  constructor(backend) {
    this.backend = backend;
    this.refs = {};
  }

  add(from, to) {
    if (typeof from === 'string') {
      this.refs[from] = to;
    } else {
      this.refs = {
        ...this.refs,
        ...from,
      };
    }

    return this;
  }

  hasRef(key) {
    return Object.keys(this.refs).includes(key);
  }

  embedsRef(key) {
    const regex = new RegExp(`^${key}\\.`);
    return Object.keys(this.refs).find(ref => regex.test(ref));
  }

  getNestedKeys(key) {
    const regex = new RegExp(`^${key}\\.`);
    return Object.keys(this.refs).filter(ref => regex.test(ref));
  }

  has(key) {
    return this.hasRef(key) || this.embedsRef(key);
  }

  // eslint-disable-next-line class-methods-use-this
  getBackendValueFor(key) {
    return typeof key === 'string' ? this.backend.get(key) : key(this.backend);
  }

  get(key, nextStore) {
    if (!this.has(key)) {
      return nextStore.get(key);
    }

    if (this.hasRef(key)) {
      return this.getBackendValueFor(this.refs[key]);
    }

    const value = nextStore.get(key);

    const nestedKeys = this.getNestedKeys(key);

    if (nestedKeys.length) {
      nestedKeys.forEach(nestedKey => {
        const val = this.getBackendValueFor(nestedKey);
        set(value, nestedKey.substr(key.length + 1), val);
      });
    }

    return value;
  }
}

export default ReferenceStore;
