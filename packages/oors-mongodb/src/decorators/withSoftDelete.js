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

export default ({ propertyName = 'isDeleted', timestampName = 'deletedAt' } = {}) => repository => {
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
  } = repository;

  repository.updateSchema(schema => ({
    ...schema,
    properties: {
      ...(schema.properties || {}),
      [propertyName]: {
        type: 'boolean',
        default: false,
      },
      [timestampName]: {
        instanceof: 'Date',
      },
    },
  }));

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
                [timestampName]: new Date(),
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
                [timestampName]: new Date(),
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
  });

  return repository;
};
