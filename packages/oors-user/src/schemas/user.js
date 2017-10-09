import Joi from 'joi';
import * as constants from '../constants/user';

export default {
  accountId: Joi.any().required(),

  username: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  salt: Joi.string(),

  isActive: Joi.boolean().default(true),
  isDeleted: Joi.boolean(),
  roles: Joi.array()
    .items(Joi.string().valid(constants.roles))
    .default(constants.defaultRoles),
  resetPassword: Joi.object()
    .keys({
      token: Joi.string(),
      resetAt: Joi.date(),
    })
    .default({}),
  lastLogin: Joi.date(),
  socialLogin: Joi.object()
    .keys({
      facebook: Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string(),
        email: Joi.string().email(),
        token: Joi.string().required(),
        expiresAt: Joi.date(),
      }),
      google: Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string(),
        email: Joi.string().email(),
        token: Joi.string().required(),
        expiresAt: Joi.date(),
      }),
    })
    .default({}),

  deletedAt: Joi.date(),
  createdAt: Joi.date(),
  updatedAt: Joi.date(),
};
