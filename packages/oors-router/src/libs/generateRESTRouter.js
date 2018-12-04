import { Router } from 'express';
import Boom from 'boom';
import { ObjectID as objectId } from 'mongodb';
import pick from 'lodash/pick';
import { validators as v } from 'easevalidation';
import { wrapHandler, toBSON } from './helpers';
import validate from '../middlewares/validate';

export default ({ router = Router(), repository }) => {
  router.param('id', async (req, res, next, rawId) => {
    let id;

    try {
      id = objectId(rawId);
    } catch (error) {
      return next(error);
    }

    try {
      const entity = await repository.findById(id);

      if (!entity) {
        return next(Boom.notFound(`Unable to find entity with id ${rawId}`));
      }

      req.entity = entity;
    } catch (err) {
      return next(err);
    }

    return next();
  });

  router
    .route('/')
    .get(
      validate({
        query: [
          v.isDefault({}),
          v.isSchema({
            query: [v.isDefault({}), v.isObject()],
            offset: v.isAny(v.isUndefined(), v.isNumber()),
            limit: v.isAny(v.isUndefined(), v.isNumber()),
            orderBy: [v.isDefault({}), v.isObject()],
            fields: [v.isDefault({}), v.isObject()],
          }),
        ],
      }),
      wrapHandler(async req => {
        const params = pick(req.query, ['fields', 'orderBy']);
        params.query = toBSON(req.query.query);

        if (req.query.offset !== undefined) {
          params.skip = parseInt(req.query.offset, 10);
        }

        if (req.query.limit !== undefined) {
          params.limit = parseInt(req.query.limit, 10);
        }

        return repository.findMany(params);
      }),
    )
    .post(wrapHandler(req => repository.createOne(toBSON(req.body))));

  router.get(
    '/count',
    validate({
      query: [
        v.isDefault({}),
        v.isSchema({
          query: [v.isDefault({}), v.isObject()],
        }),
      ],
    }),
    wrapHandler(req => repository.count({ query: toBSON(req.query.query) })),
  );

  router.delete(
    '/deleteOne',
    validate({
      query: v.isSchema({
        query: [v.isRequired(), v.isObject()],
      }),
    }),
    wrapHandler(req => repository.deleteOne({ query: toBSON(req.query.query) })),
  );

  router
    .route('/:id')
    .get((req, res) => res.json(req.entity))
    .put(
      wrapHandler(req =>
        repository.replaceOne({
          ...req.entity,
          ...toBSON(req.body),
        }),
      ),
    )
    .patch(
      wrapHandler(async req => {
        await repository.validate({
          ...req.entity,
          ...req.body,
        });

        return repository.updateOne({
          query: {
            _id: req.entity._id,
          },
          update: {
            $set: req.body,
          },
        });
      }),
    )
    .delete(wrapHandler(req => repository.deleteOne({ query: { _id: req.entity._id } })));

  router.get(
    '/findOne',
    validate({
      query: [
        v.isDefault({}),
        v.isSchema({
          query: [v.isDefault({}), v.isObject()],
        }),
      ],
    }),
    wrapHandler(async req => {
      const query = toBSON(req.query.query);
      const entity = await repository.findOne({ query });

      if (!entity) {
        throw Boom.notFound('Unable to find entity.');
      }

      return entity;
    }),
  );

  return router;
};
