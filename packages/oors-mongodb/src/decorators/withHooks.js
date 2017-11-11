import get from 'lodash/get';

export default (
  repository,
  hooks = {
    before: {},
    after: {},
  },
) => {
  [
    'findById',
    'findOne',
    'findMany',
    'createOne',
    'createMany',
    'updateOne',
    'updateMany',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'save',
  ].forEach(method => {
    const previous = repository[method];
    Object.assign(repository, {
      [method]: async (...args) => {
        if (typeof get(hooks, `before.${method}`) === 'function') {
          await hooks.before[method](...args);
        }

        const result = await previous.call(repository, ...args);

        if (typeof get(hooks, `after.${method}`) === 'function') {
          await hooks.after[method](result, ...args);
        }

        return result;
      },
    });
  });

  return repository;
};
