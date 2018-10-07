import { deleteOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';

export default deleteOne({
  repositoryName: 'blogPost',
  // you can only delete and update your own posts posts
  canDelete: (user, item) => user._id.toString() === item.createdBy.toString(),
});
