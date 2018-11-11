import { deleteOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';

export default deleteOne({
  repositoryName: 'oors.blog.Post',
  // you can only delete and update your own posts posts
  canDelete: (user, item) => user._id.toString() === item.createdBy.toString(),
});
