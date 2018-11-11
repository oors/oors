import { createOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import {
  compose,
  withArgs,
  withSchema,
} from '../../../../../../../../packages/oors-graphql/build/decorators';

export default compose(
  withSchema({
    type: 'object',
    properties: {
      input: {
        type: 'object',
        properties: {
          parentId: {
            isObjectId: true,
          },
          postId: {
            isObjectId: true,
          },
        },
        required: ['postId'],
      },
    },
  }),
  withArgs((_, { input, id }, { user, loaders }, info, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(loaders.oorsBlogComments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(loaders.oorsBlogPosts.findById.load(input.postId)) : null,
  })),
  withSchema({
    type: 'object',
    properties: {
      parent: {
        type: ['object', 'null'],
      },
      post: {
        type: 'object',
      },
    },
    required: ['post'],
  }),
)(
  createOne({
    repositoryName: 'oors.blog.Comment',
  }),
);
