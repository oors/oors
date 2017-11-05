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
        if (hooks.before[method]) {
          await hooks.before[method](...args);
        }

        const result = await previous.call(repository, ...args);

        if (hooks.after[method]) {
          await hooks.after[method](result, ...args);
        }

        return result;
      },
    });
  });

  return repository;
};
