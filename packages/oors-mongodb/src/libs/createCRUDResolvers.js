/* eslint-disable no-case-declarations */
import identity from 'lodash/identity';
import update from 'lodash/update';
import omit from 'lodash/omit';
import withSchema from 'oors-graphql/build/decorators/withSchema';
import QueryBuilder from './QueryBuilder';

const validateFindQuery = withSchema({
  type: 'object',
  properties: {
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
      maximum: 20,
      default: 10,
    },
    last: {
      type: 'integer',
      minimum: 1,
      maximum: 20,
    },
    where: {
      type: 'object',
      default: {},
    },
  },
});

export default config => {
  const { queryBuilder, getLoaders, canDelete, canUpdate, wrapQuery } = {
    queryBuilder: new QueryBuilder(),
    wrapQuery: () => identity,
    canDelete: () => true,
    canUpdate: () => true,
    ...config,
  };

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
    findMany: validateFindQuery(async (_, args, ctx) => {
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
