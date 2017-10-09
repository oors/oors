import _ from 'lodash';
import BaseStore from './Base';

class MemoryStore extends BaseStore {
  constructor(backend = {}) {
    super();
    this.backend = backend;
  }

  has(key) {
    return _.has(this.backend, key);
  }

  getBackendValue(key) {
    return _.get(this.backend, key);
  }

  set(key, value) {
    _.set(this.backend, key, value);
    return this;
  }

  add(data) {
    _.merge(this.backend, data);
    return this;
  }

  unset(key) {
    _.unset(this.backend, key);
    return this;
  }
}

export default MemoryStore;
