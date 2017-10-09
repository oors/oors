import Joi from 'joi';

export default {
  name: Joi.string().required(),
  permissions: Joi.array().items(Joi.string().required()).default([]),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
};
