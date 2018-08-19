import { UserInputError } from 'apollo-server';

export default schema => {
  let validate;

  return resolver => (_, args, ctx, info) => {
    if (typeof schema === 'function') {
      validate = ctx.ajv.compile(schema(_, args, ctx, info));
    }

    if (!validate) {
      validate = ctx.ajv.compile(schema);
    }

    if (!validate(args)) {
      throw new UserInputError('Failed validation!', {
        errorMessages: validate.errors,
      });
    }

    return resolver(_, args, ctx, info);
  };
};
