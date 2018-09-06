export default before => resolver => async (_, args, ctx, info) => {
  await before(_, args, ctx, info);
  return resolver(_, args, ctx, info);
};
