import ValidationError from 'oors/build/errors/ValidationError';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  async: 'es7',
  useDefaults: true,
});

ajvKeywords(ajv, 'instanceof');

export default schema => {
  let validate;

  return resolver => (_, args, ctx, info) => {
    if (!validate) {
      validate = ajv.compile(schema);
    }

    if (!validate(args)) {
      throw new ValidationError(validate.errors);
    }

    return resolver(_, args, ctx, info);
  };
};
