import { validators as v } from 'easevalidation';
import set from 'lodash/set';

const addTsToUpdate = (update, updateProperty) => {
  let { $set } = update;
  if (!$set) {
    $set = {};
  }

  $set[updateProperty] = new Date();

  return {
    ...update,
    $set,
  };
};

export default ({
  createProperty = 'createdAt',
  updateProperty = 'updatedAt',
} = {}) => repository => {
  const { createOne, createMany, updateOne, updateMany, replaceOne } = repository;

  repository.validators.push(
    v.isSchema({
      [createProperty]: v.isAny(v.isUndefined(), v.isDate()),
      [updateProperty]: v.isAny(v.isUndefined(), v.isDate()),
    }),
  );

  Object.assign(repository, {
    createOne(data, ...restArgs) {
      if (typeof data === 'object') {
        set(data, createProperty, new Date());
      }

      return createOne.call(repository, data, ...restArgs);
    },

    createMany(data, ...restArgs) {
      return createMany.call(
        repository,
        Array.isArray(data)
          ? data.map(item => {
              set(item, createProperty, new Date());
              return item;
            })
          : data,
        ...restArgs,
      );
    },

    updateOne({ update, ...restUpdateArgs }, ...restArgs) {
      return updateOne.call(
        repository,
        {
          ...restUpdateArgs,
          update: addTsToUpdate(update, updateProperty),
        },
        ...restArgs,
      );
    },

    updateMany({ update, ...restUpdateArgs }, ...restArgs) {
      return updateMany.call(
        repository,
        {
          ...restUpdateArgs,
          update: addTsToUpdate(update, updateProperty),
        },
        ...restArgs,
      );
    },

    replaceOne({ query, replacement, ...restArgs }) {
      set(replacement, updateProperty, new Date());
      return replaceOne.call(repository, { query, replacement, ...restArgs });
    },
  });

  return repository;
};
