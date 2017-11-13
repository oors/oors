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

export default (
  { createProperty = 'createdAt', updateProperty = 'updatedAt' } = {},
) => repository => {
  const { createOne, createMany, updateOne, updateMany, replaceOne } = repository;

  set(repository, `schema.properties.${createProperty}`, {
    instanceof: 'Date',
  });

  set(repository, `schema.properties.${updateProperty}`, {
    instanceof: 'Date',
  });

  Object.assign(repository, {
    createOne(data) {
      if (typeof data === 'object') {
        set(data, createProperty, new Date());
      }

      return createOne.call(repository, data);
    },

    createMany(data) {
      return createMany.call(
        repository,
        Array.isArray(data)
          ? data.map(item => {
              set(item, createProperty, new Date());
              return item;
            })
          : data,
      );
    },

    updateOne({ update, ...restArgs }) {
      return updateOne.call(repository, {
        ...restArgs,
        update: addTsToUpdate(update, updateProperty),
      });
    },

    updateMany({ update, ...restArgs }) {
      return updateMany.call(repository, {
        ...restArgs,
        update: addTsToUpdate(update, updateProperty),
      });
    },

    replaceOne(query, data) {
      set(data, updateProperty, new Date());
      return replaceOne.call(repository, query, data);
    },
  });

  return repository;
};
