import Joi from 'joi';
import EJSON from 'mongodb-extended-json';

export const wrapHandler = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next))
    .then(response => {
      if (typeof response !== 'undefined') {
        res.json(response);
      }
    })
    .catch(next);

export const toBSON = query =>
  EJSON.parse(typeof query !== 'string' ? JSON.stringify(query) : query);

export const idPattern = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;

export const idValidator = Joi.string().regex(idPattern).required();
