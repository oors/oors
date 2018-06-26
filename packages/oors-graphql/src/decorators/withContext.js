export default fn => resolver => async (_, args, ctx, info) =>
  resolver(_, args, await fn(_, args, ctx, info), info);
