import { UserInputError } from 'apollo-server';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';

const defaultAjv = new Ajv({
  allErrors: true,
  verbose: true,
  async: 'es7',
  useDefaults: true,
});
ajvKeywords(defaultAjv, 'instanceof');

export default (schema, ajv = defaultAjv) => {
  let validate;

  return resolver => (_, args, ctx, info) => {
    if (typeof schema === 'function') {
      validate = (ctx.ajv || ajv).compile(schema(_, args, ctx, info));
    }

    if (!validate) {
      validate = (ctx.ajv || ajv).compile(schema);
    }

    if (!validate(args)) {
      throw new UserInputError('Failed validation!', {
        errorMessages: validate.errors,
      });
    }

    return resolver(_, args, ctx, info);
  };
};
