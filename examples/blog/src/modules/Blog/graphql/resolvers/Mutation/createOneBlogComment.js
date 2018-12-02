import { validators as v } from 'easevalidation';
import { createOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import { compose, withArgs } from '../../../../../../../../packages/oors-graphql/build/decorators';
import withValidator from '../../../../../../../../packages/oors-graphql/build/decorators/withValidator';
import isObjectId from '../../../../../../../../packages/oors-mongodb/build/libs/isObjectId';

export default compose(
  withValidator(
    v.isSchema({
      input: v.isSchema({
        parentId: v.isAny(v.isUndefined(), isObjectId()),
        postId: [v.isRequired(), isObjectId()],
      }),
    }),
  ),
  withArgs((_, { input, id }, { user, loaders }, info, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(loaders.oorsBlogComments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(loaders.oorsBlogPosts.findById.load(input.postId)) : null,
  })),
  withValidator(
    v.isSchema({
      parentId: v.isAny(v.isNull(), v.isObject()),
      post: [v.isRequired(), v.isObject()],
    }),
  ),
)(
  createOne({
    repositoryName: 'oors.blog.Comment',
  }),
);
