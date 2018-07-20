import { AuthenticationError, ForbiddenError } from 'apollo-server';

export default (
  {
    isValidUser = () => true,
    getUserFromContext = ctx => ctx.user,
    handleError = () => {
      throw new ForbiddenError('Restricted access!');
    },
  } = {},
) => resolver => async (root, args, ctx, info) => {
  const user = await getUserFromContext(ctx);

  if (!user) {
    throw new AuthenticationError('Not authenticated!');
  }

  const isValid = await isValidUser(root, args, ctx, info);

  if (!isValid) {
    handleError(root, args, ctx, info, user);
  }

  return resolver(root, args, ctx, info);
};
