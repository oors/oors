import { UserInputError } from 'apollo-server';

export default validate => resolver => async (_, args, ctx, info) => {
  try {
    const isValid = await validate(_, args, ctx, info);
    if (!isValid) {
      throw new Error();
    }
  } catch (error) {
    throw new UserInputError(error.message || 'Failed Validation!', {
      originalError: error,
    });
  }

  return resolver(_, args, ctx, info);
};
