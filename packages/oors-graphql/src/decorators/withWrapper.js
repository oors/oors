export default (before, after) => resolver => async (_, args, ctx, info) => {
  if (before) {
    await before(_, args, ctx, info);
  }

  const result = await resolver(_, args, ctx, info);

  if (after) {
    await after(_, args, ctx, info, result);
  }

  return result;
};
