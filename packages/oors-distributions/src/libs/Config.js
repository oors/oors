import isPlainObject from 'lodash/isPlainObject';
import BaseConfig, { stores } from 'oors-config';

const { Memory: MemoryStore, Env: ENVStore, Reference: ReferenceStore } = stores;

class Config extends BaseConfig {
  constructor({ envPrefix = 'OORS' } = {}, ...args) {
    super(...args);
    this.refs = {};
    this.memoryStore = new MemoryStore();
    this.referenceStore = new ReferenceStore(this);

    this.addStore(this.memoryStore);
    this.addStore(new ENVStore(envPrefix));
    this.addStore(this.referenceStore);
  }

  ref(pointer) {
    const ref = Symbol(pointer);
    this.refs[ref] = pointer;
    return ref;
  }

  isRef(value) {
    return this.refs[value] !== undefined;
  }

  set(key, value) {
    if (isPlainObject(value)) {
      this.memoryStore.set(key, {});
      return Object.keys(value).forEach(subKey => {
        this.set(`${key}.${subKey}`, value[subKey]);
      });
    }

    if (this.isRef(value)) {
      return this.referenceStore.add(key, this.refs[value]);
    }

    return this.memoryStore.set(key, value);
  }

  add(config) {
    Object.keys(config).forEach(key => {
      this.set(key, config[key]);
    });
  }
}

export default Config;
