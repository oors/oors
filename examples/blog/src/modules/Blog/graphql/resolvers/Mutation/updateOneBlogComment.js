import { updateOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { compose, withArgs } from '../../../../../../../../packages/oors-graphql/build/decorators';

export default compose(
  withArgs((_, { input, id }, { user, loaders }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(loaders.blogComments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(loaders.blogPosts.findById.load(input.postId)) : null,
  })),
)(
  updateOne({
    repositoryName: 'blogComment',
    canUpdate: (user, item) => user._id.toString() === item.createdBy.toString(),
  }),
);
