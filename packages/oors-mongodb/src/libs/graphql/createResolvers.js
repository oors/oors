/* eslint-disable no-case-declarations */
import invariant from 'invariant';
import identity from 'lodash/identity';
import omit from 'lodash/omit';
import withSchema from 'oors-graphql/build/decorators/withSchema';

const createPaginationSchema = ({ maxPerPage, defaultPerPage } = {}) => ({
  skip: {
    type: 'integer',
    minimum: 0,
    default: 0,
  },
  after: {
    isObjectId: true,
  },
  before: {
    isObjectId: true,
  },
  first: {
    type: 'integer',
    minimum: 1,
    maximum: maxPerPage,
    default: defaultPerPage,
  },
  last: {
    type: 'integer',
    minimum: 1,
    maximum: maxPerPage,
  },
});

export const buildConfig = config => {
  if (typeof config === 'string') {
    return buildConfig({
      repositoryName: config,
    });
  }

  const { wrapPipeline, nodeVisitors, getInitialPipeline, repositoryName } = {
    wrapPipeline: () => identity,
    getInitialPipeline: (_, args, ctx, repository) => repository.createPipeline(),
    canDelete: () => true,
    canUpdate: () => true,
    nodeVisitors: [],
    ...config,
    pagination: {
      maxPerPage: 20,
      defaultPerPage: 10,
      ...(config.pagination || {}),
    },
  };

  if (repositoryName) {
    if (!config.getRepository) {
      Object.assign(config, {
        getRepository: ({ getRepository }) => getRepository(repositoryName),
      });
    }

    if (!config.getLoaders) {
      Object.assign(config, {
        getLoaders: ({ app, loaders }) =>
          loaders[app.modules.get('oors.rad').getLoadersName(repositoryName)],
      });
    }
  }

  invariant(
    typeof config.getRepository === 'string' || typeof config.getRepository === 'function',
    `Invalid required getRepository parameter (needs to be a repository name or a function that 
      will receive a resolver context as argument)`,
  );

  invariant(
    typeof config.getLoaders === 'function',
    `Invalid required getLoaders parameter (needs to be a function that will receive a resolver 
      context as argument and returns DataLoader instances)`,
  );

  const getRepository =
    typeof config.getRepository === 'string'
      ? ctx => ctx.getRepository(config.getRepository)
      : config.getRepository;

  const createPipeline = (_, args, ctx) => {
    const repository = getRepository(ctx);
    const pipeline = args.pipeline || getInitialPipeline(_, args, ctx, repository);

    return wrapPipeline(_, args, ctx)(
      ctx.gqlQueryParser.toPipeline(args, {
        repository,
        pipeline,
        nodeVisitors,
      }),
    );
  };

  return {
    createPipeline,
    getRepository,
    ...config,
  };
};

export const findById = config => {
  const { getLoaders } = buildConfig(config);
  return (_, { id }, ctx) => getLoaders(ctx).findById.load(id);
};

export const findOne = config => {
  const { getLoaders, createPipeline } = buildConfig(config);
  return withSchema({
    type: 'object',
    properties: {
      where: {
        type: 'object',
        default: {},
      },
    },
    required: ['where'],
  })(async (_, args, ctx) => {
    const results = await getLoaders(ctx).aggregate.load(createPipeline(_, args, ctx).limit(1));
    return results.length > 0 ? ctx.fromMongo(results[0]) : null;
  });
};

export const findMany = config => {
  const { getLoaders, createPipeline, pagination } = buildConfig(config);

  return withSchema({
    type: 'object',
    properties: {
      ...createPaginationSchema(pagination),
      where: {
        type: 'object',
        default: {},
      },
    },
  })(async (_, args, ctx) => {
    const pivot = args.before || args.after;

    if (pivot) {
      Object.assign(args, {
        pivot: await getLoaders(ctx).findById.load(pivot),
      });
    }

    return getLoaders(ctx)
      .aggregate.load(createPipeline(_, args, ctx))
      .then(ctx.fromMongoArray);
  });
};

export const count = config => {
  const { getLoaders, createPipeline } = buildConfig(config);
  return async (_, args, ctx) => {
    const results = await getLoaders(ctx).aggregate.load(createPipeline(_, args, ctx).count());
    return Array.isArray(results) && results.length > 0 ? results[0].count : 0;
  };
};

export const createOne = config => {
  const { getRepository } = buildConfig(config);
  return async (_, { input }, ctx) => ctx.fromMongo(await getRepository(ctx).createOne(input));
};

export const createMany = config => {
  const { getRepository } = buildConfig(config);
  return async (_, args, ctx) =>
    (await getRepository(ctx).createMany(args.input)).map(ctx.fromMongo);
};

export const updateOne = config => {
  const { getRepository, getLoaders, createPipeline, canUpdate } = buildConfig(config);
  return async (_, args, ctx, info) => {
    const { input } = args;
    const Repository = getRepository(ctx);
    let { item } = args.item;

    if (item === undefined) {
      const results = await getLoaders(ctx).aggregate.load(createPipeline(_, args, ctx).limit(1));
      item = Array.isArray(results) && results.length > 0 ? results[0] : undefined;
    }

    if (!item) {
      throw new Error('Unable to find item!');
    }

    if (!canUpdate(_, args, ctx, info, item)) {
      throw new Error('Not Allowed!');
    }

    await Repository.validate(
      omit(
        {
          ...item,
          ...input,
        },
        ['_id'],
      ),
    );

    return ctx.fromMongo(
      await Repository.updateOne({
        query: {
          _id: item._id,
        },
        update: {
          $set: input,
        },
      }),
    );
  };
};

export const deleteOne = config => {
  const { getRepository, getLoaders, createPipeline, canDelete } = buildConfig(config);
  return async (_, args, ctx, info) => {
    const Repository = getRepository(ctx);
    let { item } = args.item;

    if (item === undefined) {
      const results = await getLoaders(ctx).aggregate.load(createPipeline(_, args, ctx).limit(1));
      item = Array.isArray(results) && results.length > 0 ? results[0] : undefined;
    }

    if (!item) {
      throw new Error('Unable to find item!');
    }

    if (!canDelete(_, args, ctx, info, item)) {
      throw new Error('Not Allowed!');
    }

    return ctx.fromMongo(await Repository.deleteOne({ query: { _id: item._id } }));
  };
};

export default config => ({
  findById: findById(config),
  findOne: findOne(config),
  findMany: findMany(config),
  count: count(config),
  createOne: createOne(config),
  createMany: createMany(config),
  updateOne: updateOne(config),
  deleteOne: deleteOne(config),
});
