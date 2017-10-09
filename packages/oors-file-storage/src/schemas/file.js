import Joi from 'joi';

export default {
  _id: Joi.object(),
  filename: Joi.string().required(),
  mimeType: Joi.string().required(),
  extension: Joi.string().required(),
  size: Joi.number().required(),
  uploadedAt: Joi.date(),
  meta: Joi.object().default({}),
};
