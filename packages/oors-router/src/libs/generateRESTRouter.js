import { Router } from 'express';
import Boom from 'boom';
import Joi from 'joi';
import celebrate from 'celebrate';
import { ObjectID as objectId } from 'mongodb';
import pick from 'lodash/pick';
import {
  wrapHandler,
  idValidator as mongoIdValidator,
  toBSON,
} from './helpers';

export default ({
  router = Router(),
  repository,
  idValidator = mongoIdValidator,
}) => {
  router.param('id', async (req, res, next, rawId) => {
    const { error, value } = Joi.validate(rawId, idValidator);

    if (error) {
      return next(error);
    }

    const id = objectId(value);

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
      celebrate({
        query: {
          query: Joi.object().default({}),
          offset: Joi.number(),
          limit: Joi.number(),
          orderBy: Joi.object().default({}),
          fields: Joi.object().default({}),
        },
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

        const cursor = await repository.findMany(params);

        return cursor.toArray();
      }),
    )
    .post(wrapHandler(req => repository.createOne(toBSON(req.body))));

  router.get(
    '/count',
    celebrate({
      query: {
        query: Joi.object().default({}),
      },
    }),
    wrapHandler(req => repository.count({ query: toBSON(req.query.query) })),
  );

  router.delete(
    '/deleteOne',
    celebrate({
      query: Joi.object().required(),
    }),
    wrapHandler(req =>
      repository.deleteOne({ query: toBSON(req.query.query) }),
    ),
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
    .delete(
      wrapHandler(req =>
        repository.deleteOne({ query: { _id: req.entity._id } }),
      ),
    );

  router.get(
    '/findOne',
    celebrate({
      query: {
        query: Joi.object().default({}),
      },
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
