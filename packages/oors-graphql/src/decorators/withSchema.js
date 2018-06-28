import { UserInputError } from 'apollo-server';
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
      throw new UserInputError('Failed validation!', {
        errorMessages: validate.errors,
      });
    }

    return resolver(_, args, ctx, info);
  };
};
