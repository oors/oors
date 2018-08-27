/* eslint-disable no-case-declarations */
import invariant from 'invariant';
import identity from 'lodash/identity';
import update from 'lodash/update';
import omit from 'lodash/omit';
import withSchema from 'oors-graphql/build/decorators/withSchema';
import { ObjectID as objectId } from 'mongodb';
import QueryBuilder from './QueryBuilder';
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
  const { queryBuilder, getLoaders, canDelete, canUpdate, wrapQuery, pagination } = {
    queryBuilder: new QueryBuilder(),
    wrapQuery: () => identity,
    canDelete: () => true,
    canUpdate: () => true,
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

  const findManyQuery = (...args) =>
    update(queryBuilder.toQuery(...args), 'query', wrapQuery(...args));
  const findOneQuery = (...args) =>
    update(queryBuilder.toQuery(...args), 'query', wrapQuery(...args));
  const countQuery = (...args) =>
    update(queryBuilder.toQuery(...args), 'query', wrapQuery(...args));
  const getRepository =
    typeof config.getRepository === 'string'
      ? ctx => ctx.getRepository(config.getRepository)
      : config.getRepository;

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
    })((_, args, ctx) => getLoaders(ctx).findOne.load(findOneQuery(args, ctx))),
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

      return getLoaders(ctx).findMany.load(findManyQuery(args, ctx));
    }),
    count: (_, args, ctx) => getRepository(ctx).count(countQuery(args, ctx)),
    createOne: async (_, { input }, ctx) =>
      ctx.fromMongo(await getRepository(ctx).createOne(input)),
    createMany: async (_, args, ctx) =>
      (await getRepository(ctx).createMany(args.input)).map(ctx.fromMongo),
    updateOne: async (_, args, ctx) => {
      const { input } = args;
      const Repository = getRepository(ctx);
      const item = args.item || (await Repository.findOne(findOneQuery(args, ctx)));

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
      const item = args.item || (await Repository.findOne(findOneQuery(args, ctx)));

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
  count: {
    loader: queries => Promise.all(queries.map((query = {}) => Repository.count(query))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
});
