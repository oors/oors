export default resultTransformer => resolver => async (_, args, ctx, info) => {
  const result = await resolver(_, args, ctx, info);
  return resultTransformer(_, args, ctx, info, result);
};
