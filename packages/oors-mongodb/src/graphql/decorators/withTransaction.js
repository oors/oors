export default (resolver, options = {}) => async (_, args, ctx, info) => {
  let result;

  await ctx.modules.get('oors.mongodb').transaction(async () => {
    result = await resolver(_, args, ctx, info);
  }, options);

  return result;
};
