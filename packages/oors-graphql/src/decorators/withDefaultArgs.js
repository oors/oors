import merge from 'lodash/merge';

export default defaultArgs => resolver => async (_, args, ctx, info) =>
  resolver(_, merge({}, defaultArgs, args), ctx, info);
