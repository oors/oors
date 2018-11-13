import set from 'lodash/set';

export default ({ propertyName = 'isDeleted' } = {}) => repository => {
  const { findOne, findMany, count, updateOne, updateMany } = repository;

  set(repository, `schema.properties.${propertyName}`, {
    type: 'boolean',
    default: false,
  });

  Object.assign(repository, {
    findOne: ({ query = {}, ...restArgs } = {}) =>
      findOne.call(repository, {
        query: {
          isDeleted: false,
          ...query,
        },
        ...restArgs,
      }),
    findMany: ({ query = {}, ...restArgs } = {}) =>
      findMany.call(repository, {
        query: {
          isDeleted: false,
          ...query,
        },
        ...restArgs,
      }),
    count: ({ query = {}, ...restArgs } = {}) =>
      count.call(repository, {
        query: {
          isDeleted: false,
          ...query,
        },
        ...restArgs,
      }),
    deleteOne: ({ query = {} } = {}) =>
      updateOne.call(repository, {
        query,
        update: {
          $set: {
            [propertyName]: true,
          },
        },
      }),
    deleteMany: ({ query = {} } = {}) =>
      updateMany.call(repository, {
        query,
        update: {
          $set: {
            [propertyName]: true,
          },
        },
      }),
  });

  return repository;
};
