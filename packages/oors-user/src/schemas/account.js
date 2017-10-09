import Joi from 'joi';

export default {
  name: Joi.string(),
  isActive: Joi.boolean().default(true),
  isDeleted: Joi.boolean(),
  isConfirmed: Joi.boolean().default(false),

  deletedAt: Joi.date(),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
};
