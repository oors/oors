import { updateOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import { compose, withArgs } from '../../../../../../../../packages/oors-graphql/build/decorators';

export default compose(
  withArgs((_, { input, id }, { user, loaders }, info, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(loaders.oorsBlogComments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(loaders.oorsBlogPosts.findById.load(input.postId)) : null,
  })),
)(
  updateOne({
    repositoryName: 'oors.blog.Comment',
    canUpdate: (user, item) => user._id.toString() === item.createdBy.toString(),
  }),
);
