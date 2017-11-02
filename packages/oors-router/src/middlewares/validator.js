import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';

export default {
  id: 'validate',
  factory: options => {
    const ajv = new Ajv({
      allErrors: true,
      async: 'es7',
      coerceTypes: 'array',
      useDefaults: true,
      ...options,
    });

    ajvKeywords(ajv, 'instanceof');

    return async (req, res, next) => {
      req.ajv = ajv;
      return next();
    };
  },
  params: {},
};
