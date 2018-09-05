import {
  withArgs,
  withSchema,
} from '../../../../../../../../packages/oors-graphql/build/decorators';

export const validateCreateCommentInput = withSchema({
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
});

export const parseCommentInput = withArgs((_, { input, id }, { user, loaders }, { resolve }) => ({
  input: {
    ...input,
    [id ? 'updatedBy' : 'createdBy']: user._id,
  },
  parent: input.parentId ? resolve(loaders.blogComments.findById.load(input.parentId)) : null,
  post: input.postId ? resolve(loaders.blogPosts.findById.load(input.postId)) : null,
}));

export const validateCreateCommentReferences = withSchema({
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
});
