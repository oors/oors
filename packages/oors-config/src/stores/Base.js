/* eslint-disable class-methods-use-this */
import isPlainObject from 'lodash/isPlainObject';
import mergeWith from 'lodash/mergeWith';

class Base {
  // eslint-disable-next-line no-unused-vars
  has(key) {
    throw new Error('Not implemented!');
  }

  // eslint-disable-next-line no-unused-vars
  getBackendValue(key) {
    throw new Error('Not implemented!');
  }

  async get(key, nextStore) {
    if (!this.has(key)) {
      return nextStore.get(key);
    }

    const value = await this.getBackendValue(key);

    if (!this.isMergeable(value)) {
      return value;
    }

    const nextValue = await nextStore.get(key);

    if (value !== undefined && !this.isMergeable(nextValue)) {
      return value;
    }

    return this.merge(nextValue, value);
  }

  isMergeable(value) {
    return Array.isArray(value) || isPlainObject(value);
  }

  merge(src1, src2) {
    // eslint-disable-next-line consistent-return
    return mergeWith({}, src1, src2, (val1, val2) => {
      if (Array.isArray(val1) && Array.isArray(val2)) {
        return [...val1, ...val2];
      }
    });
  }
}

export default Base;
