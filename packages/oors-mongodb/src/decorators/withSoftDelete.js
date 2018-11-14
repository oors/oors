import set from 'lodash/set';

const withSoftDeleteFilter = (
  propertyName,
  { query = {}, noSoftDeleteFilter, ...restArgs } = {},
) => ({
  query: {
    ...(noSoftDeleteFilter
      ? {}
      : {
          [propertyName]: false,
        }),
    ...query,
  },
  ...restArgs,
});

export default ({ propertyName = 'isDeleted' } = {}) => repository => {
  const {
    findOne,
    findMany,
    count,
    updateOne,
    updateMany,
    deleteOne,
    deleteMany,
    toMongoPipeline,
    aggregate,
    createPipeline,
  } = repository;

  set(repository, `schema.properties.${propertyName}`, {
    type: 'boolean',
    default: false,
  });

  Object.assign(repository, {
    findOne: args => findOne.call(repository, withSoftDeleteFilter(propertyName, args)),
    findMany: args => findMany.call(repository, withSoftDeleteFilter(propertyName, args)),
    count: args => count.call(repository, withSoftDeleteFilter(propertyName, args)),
    deleteOne: ({ query = {}, noSoftDeleteFilter, ...restArgs } = {}) =>
      noSoftDeleteFilter
        ? deleteOne.call(repository, {
            query,
            ...restArgs,
          })
        : updateOne.call(repository, {
            query,
            update: {
              $set: {
                [propertyName]: true,
              },
            },
          }),
    deleteMany: ({ query = {}, noSoftDeleteFilter, ...restArgs } = {}) =>
      noSoftDeleteFilter
        ? deleteMany.call(repository, {
            query,
            ...restArgs,
          })
        : updateMany.call(repository, {
            query,
            update: {
              $set: {
                [propertyName]: true,
              },
            },
          }),
    aggregate: (pipeline, { noSoftDeleteFilter, ...restOptions } = {}) =>
      aggregate.call(
        repository,
        noSoftDeleteFilter
          ? pipeline
          : [
              {
                $match: {
                  [propertyName]: false,
                },
              },
              ...toMongoPipeline.call(repository, pipeline),
            ],
        restOptions,
      ),
    createPipeline: (initialPipeline = [], { noSoftDeleteFilter, ...restOptions }) =>
      createPipeline.call(
        repository,
        noSoftDeleteFilter
          ? initialPipeline
          : [
              {
                $match: {
                  [propertyName]: false,
                },
              },
              ...initialPipeline,
            ],
        restOptions,
      ),
  });

  return repository;
};
