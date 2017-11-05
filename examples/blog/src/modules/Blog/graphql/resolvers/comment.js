import { createCRUDResolvers } from '../../../../../../../packages/oors-mongodb/src/libs/graphql';
import {
  compose,
  withArgs,
  withSchema,
} from '../../../../../../../packages/oors-graphql/src/decorators';

const resolvers = createCRUDResolvers({
  getRepository: ({ app }) => app.modules.get('oors.blog').CommentRepository,
  getLoaders: ({ loaders }) => loaders.blog.comments,
});

const validateCreateCommentInput = withSchema({
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

const parseCommentInput = withArgs(
  ({ input, id }, { user = {}, loaders: { blog: { posts, comments } } }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id,
    },
    parent: input.parentId ? resolve(comments.findById.load(input.parentId)) : null,
    post: input.postId ? resolve(posts.findById.load(input.postId)) : null,
  }),
);

const validateCreateCommentReferences = withSchema({
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

export default {
  BlogComment: {
    parent: (comment, args, { loaders }) =>
      comment.parentId ? loaders.blog.comments.findById.load(comment.parentId) : null,
    children: (comment, args, { loaders }) =>
      loaders.blog.comments.findMany.load({
        query: {
          parentId: comment.id,
        },
      }),
    post: (comment, args, { loaders }) => loaders.blog.posts.findById.load(comment.postId),
    author: (comment, args, { loaders }) => loaders.users.findById.load(comment.createdBy),
  },
  Mutation: {
    createBlogComment: compose(
      validateCreateCommentInput,
      parseCommentInput,
      validateCreateCommentReferences,
    )(resolvers.createOne),

    updateBlogComment: compose(parseCommentInput)(resolvers.updateOne),
  },
};
