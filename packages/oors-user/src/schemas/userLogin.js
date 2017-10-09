import Joi from 'joi';

export default {
  userId: Joi.any().required(),
  ip: Joi.string().required(),
  browser: Joi.string().required(),
  os: Joi.string().required(),
  platform: Joi.string().required(),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
};
