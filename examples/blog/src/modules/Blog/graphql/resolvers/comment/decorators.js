import { withArgs, withSchema } from 'oors-graphql/build/decorators';

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

export const parseCommentInput = withArgs(
  ({ input, id }, { user, loaders: { blog: { posts, comments } } }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(comments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(posts.findById.load(input.postId)) : null,
  }),
);

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
