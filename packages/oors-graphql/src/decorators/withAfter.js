export default after => resolver => async (_, args, ctx, info) => {
  const result = await resolver(_, args, ctx, info);
  await after(_, args, ctx, info, result);
  return result;
};
