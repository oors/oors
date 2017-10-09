import Joi from 'joi';

export default {
  userId: Joi.any().required(),
  groupIds: Joi.array().items(Joi.any()).default([]),
  permissions: Joi.array().items(Joi.string().required()).default([]),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
};
