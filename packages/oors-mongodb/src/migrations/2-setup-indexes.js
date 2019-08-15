import Migration from '../libs/Migration';

export default class extends Migration {
  name = 'Setup Indexes';

  indexes = {
    Migration: [
      {
        keys: {
          timestamp: -1,
        },
      },
    ],
  };

  async up() {
    const promises = [];

    Object.keys(this.indexes).forEach(repository => {
      this.indexes[repository].forEach(({ keys, options = {} }) => {
        promises.push(
          this.getCollection(repository).createIndex(keys, {
            ...options,
            background: true,
          }),
        );
      });
    });

    await Promise.all(promises);
  }
}
