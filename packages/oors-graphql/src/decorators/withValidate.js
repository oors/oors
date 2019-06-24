import { UserInputError } from 'apollo-server';

export default (validate, message) => resolver => async (_, args, ctx, info) => {
  try {
    const isValid = await validate(_, args, ctx, info);
    if (!isValid) {
      throw new Error();
    }
  } catch (error) {
    throw new UserInputError(message || error.message || 'Failed Validation!', {
      originalError: error,
    });
  }

  return resolver(_, args, ctx, info);
};
