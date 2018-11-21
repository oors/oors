import defaultsDeep from 'lodash/defaultsDeep';

export default defaultArgs => resolver => async (_, args, ctx, info) => {
  const defaults =
    typeof defaultArgs === 'function' ? defaultArgs(_, args, ctx, info) : defaultArgs;

  return resolver(_, defaultsDeep(args, defaults), ctx, info);
};
