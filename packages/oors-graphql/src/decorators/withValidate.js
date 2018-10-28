import { UserInputError } from 'apollo-server';

export default validate => resolver => (_, args, ctx, info) => {
  if (!validate(_, args, ctx, info)) {
    throw new UserInputError('Failed validation!', {
      errorMessages: validate.errors,
    });
  }

  return resolver(_, args, ctx, info);
};
