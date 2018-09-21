/* eslint-disable no-case-declarations */
import invariant from 'invariant';
import identity from 'lodash/identity';
import omit from 'lodash/omit';
import withSchema from 'oors-graphql/build/decorators/withSchema';
import { ObjectID as objectId } from 'mongodb';
import { fromMongo, fromMongoArray } from './helpers';

const createPaginationSchema = ({ maxPerPage, defaultPerPage } = {}) => ({
  skip: {
    type: 'integer',
    minimum: 0,
    default: 0,
  },
  after: {
    type: 'string',
  },
  before: {
    type: 'string',
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

export const createCRUDResolvers = config => {
  const { getLoaders, canDelete, canUpdate, wrapPipeline, nodeVisitors, pagination } = {
    wrapPipeline: () => identity,
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

  invariant(
    typeof config.getRepository === 'string' || typeof config.getRepository === 'function',
    `Invalid required getRepository parameter (needs to be a repository name or a function that 
      will receive a resolver context as argument)`,
  );

  invariant(
    typeof getLoaders === 'function',
    `Invalid required getLoaders parameter (needs to be a function that will receive a resolver 
      context as argument and returns DataLoader instances)`,
  );

  const getRepository =
    typeof config.getRepository === 'string'
      ? ctx => ctx.getRepository(config.getRepository)
      : config.getRepository;

  const createPipeline = (args, ctx) =>
    wrapPipeline(args, ctx)(
      ctx.gqlQueryParser.toPipeline(args, {
        repository: getRepository(ctx),
        nodeVisitors,
      }),
    );

  return {
    findById: (_, { id }, ctx) => getLoaders(ctx).findById.load(id),
    findOne: withSchema({
      type: 'object',
      properties: {
        where: {
          type: 'object',
          default: {},
        },
      },
      required: ['where'],
    })(async (_, args, ctx) => {
      const results = await getLoaders(ctx).aggregate.load(createPipeline(args, ctx).limit(1));
      return results.length > 0 ? ctx.fromMongo(results[0]) : null;
    }),
    findMany: withSchema({
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
        .aggregate.load(createPipeline(args, ctx))
        .then(ctx.fromMongoArray);
    }),
    count: async (_, args, ctx) => {
      const results = await getLoaders(ctx).aggregate.load(createPipeline(args, ctx).count());
      return Array.isArray(results) && results.length > 0 ? results[0].count : null;
    },
    createOne: async (_, { input }, ctx) =>
      ctx.fromMongo(await getRepository(ctx).createOne(input)),
    createMany: async (_, args, ctx) =>
      (await getRepository(ctx).createMany(args.input)).map(ctx.fromMongo),
    updateOne: async (_, args, ctx) => {
      const { input } = args;
      const Repository = getRepository(ctx);
      let { item } = args.item;

      if (item === undefined) {
        const results = await getLoaders(ctx).aggregate.load(createPipeline(args, ctx).limit(1));
        item = Array.isArray(results) && results.length > 0 ? results[0] : undefined;
      }

      if (!item) {
        throw new Error('Unable to find item!');
      }

      if (!canUpdate(ctx.user, item)) {
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
    },
    deleteOne: async (_, args, ctx) => {
      const Repository = getRepository(ctx);
      let { item } = args.item;

      if (item === undefined) {
        const results = await getLoaders(ctx).aggregate.load(createPipeline(args, ctx).limit(1));
        item = Array.isArray(results) && results.length > 0 ? results[0] : undefined;
      }

      if (!item) {
        throw new Error('Unable to find item!');
      }

      if (!canDelete(ctx.user, item)) {
        throw new Error('Not Allowed!');
      }

      return ctx.fromMongo(await Repository.deleteOne({ query: { _id: item._id } }));
    },
  };
  // @TODO: add updateMany, deleteMany
};

export const createLoaders = Repository => ({
  findById: {
    loader: async ids => {
      const items = fromMongoArray(
        await Repository.findMany({
          query: {
            _id: {
              $in: ids.map(objectId),
            },
          },
        }),
      );

      return ids.map(id => items.find(item => item.id.toString() === id.toString()) || null);
    },
    options: {
      cacheKeyFn: key => key.toString(),
    },
  },
  findOne: {
    loader: queries =>
      Promise.all(
        queries.map(query =>
          Repository.findOne(query).then(item => (item ? fromMongo(item) : null)),
        ),
      ),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
  findMany: {
    loader: queries =>
      Promise.all(queries.map((query = {}) => Repository.findMany(query).then(fromMongoArray))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
  aggregate: {
    loader: pipelines => Promise.all(pipelines.map(pipeline => Repository.aggregate(pipeline))),
    options: {
      cacheKeyFn: key => JSON.stringify(Repository.toMongoPipeline(key)),
    },
  },
  count: {
    loader: queries => Promise.all(queries.map((query = {}) => Repository.count(query))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
});
