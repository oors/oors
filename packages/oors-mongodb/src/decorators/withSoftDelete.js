import set from 'lodash/set';

const toSoftDeleteFilter = ({ noSoftDeleteFilter, propertyName }) =>
  noSoftDeleteFilter
    ? {}
    : {
        [propertyName]: false,
      };

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
    findOne: ({ query = {}, noSoftDeleteFilter, ...restArgs } = {}) =>
      findOne.call(repository, {
        query: {
          ...toSoftDeleteFilter({ propertyName, noSoftDeleteFilter }),
          ...query,
        },
        ...restArgs,
      }),
    findMany: ({ query = {}, noSoftDeleteFilter, ...restArgs } = {}) =>
      findMany.call(repository, {
        query: {
          ...toSoftDeleteFilter({ propertyName, noSoftDeleteFilter }),
          ...query,
        },
        ...restArgs,
      }),
    count: ({ query = {}, noSoftDeleteFilter, ...restArgs } = {}) =>
      count.call(repository, {
        query: {
          ...toSoftDeleteFilter({ propertyName, noSoftDeleteFilter }),
          ...query,
        },
        ...restArgs,
      }),
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
