export default ({
  isValidUser = () => true,
  getUserFromContext = ctx => ctx.user,
  handleError = () => {
    throw new Error('Restricted access!');
  },
}) => resolver => async (root, args, ctx, info) => {
  const user = await getUserFromContext(ctx);

  if (!user) {
    throw new Error('Not authenticated!');
  }

  const isValid = await isValidUser(root, args, ctx, info);

  if (!isValid) {
    handleError(root, args, ctx, info, user);
  }

  return resolver(root, args, ctx, info);
};
