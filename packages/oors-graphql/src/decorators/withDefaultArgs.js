import merge from 'lodash/merge';

export default defaultArgs => resolver => async (_, args, ctx, info) => {
  const defaults =
    typeof defaultArgs === 'function' ? defaultArgs(_, args, ctx, info) : defaultArgs;

  return resolver(_, merge({}, defaults, args), ctx, info);
};
