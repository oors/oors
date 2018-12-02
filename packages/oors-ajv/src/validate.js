import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import ValidationError from './ValidationError';

export default (data, schema, options = {}) => {
  const ajv = new Ajv({
    allErrors: true,
    async: 'es7',
    coerceTypes: 'array',
    useDefaults: true,
    ...options,
  });

  ajvKeywords(ajv, 'instanceof');

  const validator = ajv.compile(schema);

  if (!validator(data)) {
    throw new ValidationError(validator.errors);
  }

  return data;
};
