import omit from 'lodash/omit';
import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';

class Seeder {
  static async resolveMap(map, fn) {
    const keys = Object.keys(map);

    const list = await Promise.all(keys.map(key => fn(map[key])));

    return keys.reduce(
      (acc, key, index) => ({
        ...acc,
        [key]: list[index],
      }),
      {},
    );
  }

  constructor() {
    this.branches = {};
  }

  addResolver(branch, resolver, refs = {}) {
    this.branches[branch] = {
      resolver,
      refs: Object.keys(refs).reduce((acc, key) => {
        const refConfig = typeof refs[key] === 'string' ? { branch: refs[key] } : refs[key];

        if (!refConfig.foreignProperty) {
          refConfig.foreignProperty = '_id';
        }

        return {
          ...acc,
          [key]: refConfig,
        };
      }, {}),
      data: null,
    };
  }

  load(data) {
    this.data = data;
    return Promise.all(Object.keys(this.data).map(this.seedBranch.bind(this)));
  }

  async seedBranch(branch) {
    if (!this.branches[branch].promise) {
      this.branches[branch].promise = new Promise(async resolve => {
        const dataWithReferences = await this.linkReferences(branch);
        this.branches[branch].data = await this.constructor.resolveMap(
          dataWithReferences,
          this.branches[branch].resolver,
        );

        resolve();
      });
    }

    return this.branches[branch].promise;
  }

  async linkReferences(branch) {
    const { refs } = this.branches[branch];
    await Promise.all(Object.values(refs).map(ref => this.seedBranch(ref.branch)));

    const items = this.data[branch];

    return Object.keys(items).reduce((acc, index) => {
      const itemData = items[index];
      const item = omit(itemData, Object.keys(refs));

      Object.keys(refs).forEach(key => {
        const ref = refs[key];

        if (!has(itemData, key)) {
          return;
        }

        const itemRefValue = get(itemData, key);

        if (Array.isArray(itemRefValue)) {
          set(
            item,
            ref.localProperty || `${key}Ids`,
            itemRefValue.map(alias => this.branches[ref.branch].data[alias][ref.foreignProperty]),
          );
        } else {
          set(
            item,
            ref.localProperty || `${key}Id`,
            this.branches[ref.branch].data[itemRefValue][ref.foreignProperty],
          );
        }
      });

      return {
        ...acc,
        [index]: item,
      };
    }, {});
  }
}

export default Seeder;
