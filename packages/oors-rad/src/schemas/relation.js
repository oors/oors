import Joi from 'joi';

export default {
  model: Joi.string().required(),
  refProperty: Joi.string(),
  idProperty: Joi.string().default('_id'),
  type: Joi.string()
    .valid(['one', 'many'])
    .default('one'),
};
