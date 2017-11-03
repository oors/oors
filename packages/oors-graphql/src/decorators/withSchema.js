import ValidationError from 'oors/build/errors/ValidationError';

export default schema => {
  let validate;

  return resolver => (_, args, ctx, info) => {
    if (!validate) {
      validate = ctx.ajv.compile(schema);
    }

    if (!validate(args)) {
      throw new ValidationError(validate.errors);
    }

    return resolver(_, args, ctx, info);
  };
};
