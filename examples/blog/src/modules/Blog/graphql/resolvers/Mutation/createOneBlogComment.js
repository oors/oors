import { createOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
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
            isId: true,
          },
          postId: {
            isId: true,
          },
        },
        required: ['postId'],
      },
    },
  }),
  withArgs((_, { input, id }, { user, loaders }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(loaders.blogComments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(loaders.blogPosts.findById.load(input.postId)) : null,
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
    repositoryName: 'blogComment',
  }),
);
