import { findMany } from 'oors-mongodb/build/graphql/createResolvers';

export default findMany({
  repositoryName: 'oors.user.User',
  getInitialPipeline: (account, args, ctx, info, pipeline) =>
    pipeline.match({
      accountId: account._id,
    }),
});
