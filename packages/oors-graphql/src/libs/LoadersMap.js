import set from 'lodash/set';
import has from 'lodash/has';
import get from 'lodash/get';
import DataLoader from 'dataloader';
import invariant from 'invariant';

class LoadersMap {
  constructor() {
    this.loaders = {};
  }

  multiAdd(map, namespace) {
    Object.keys(map).forEach(key => {
      this.add(`${namespace ? `${namespace}.` : ''}${key}`, map[key]);
    });
  }

  add(id, batchLoadFn, options) {
    invariant(!has(this.loaders, id), `Unable to add loader for id - ${id}! Id already exists.`);

    set(this.loaders, id, [batchLoadFn, options]);

    return this;
  }

  build(path) {
    const loaders = path ? get(this.loaders, path) : this.loaders;

    return Object.keys(loaders).reduce(
      (acc, key) => ({
        ...acc,
        [key]: Array.isArray(loaders[key])
          ? new DataLoader(...loaders[key])
          : this.build(`${path ? `${path}.` : ''}${key}`),
      }),
      {},
    );
  }
}

export default LoadersMap;
