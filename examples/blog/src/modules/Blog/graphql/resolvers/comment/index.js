import {
  createOne,
  updateOne,
} from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { compose } from '../../../../../../../../packages/oors-graphql/build/decorators';
import {
  validateCreateCommentInput,
  parseCommentInput,
  validateCreateCommentReferences,
} from './decorators';

const resolversConfig = {
  getRepository: 'blogComment',
  getLoaders: ({ loaders }) => loaders.blogComments,
  canUpdate: (user, item) => user._id.toString() === item.createdBy.toString(),
  canDelete: (user, item) => user._id.toString() === item.createdBy.toString(),
};

export default {
  BlogComment: {
    parent: (comment, args, { loaders }) => comment.parentId ? loaders.blogComments.findById.load(comment.parentId) : null,
    children: (comment, args, { loaders }) => loaders.blogComments.findMany.load({
      query: {
        parentId: comment.id,
      },
    }),
    post: (comment, args, { loaders }) => loaders.blogPosts.findById.load(comment.postId),
    author: (comment, args, { loaders }) => loaders.users.findById.load(comment.createdBy),
  },
  Mutation: {
    createOneBlogComment: compose(
      validateCreateCommentInput,
      parseCommentInput,
      validateCreateCommentReferences,
    )(createOne(resolversConfig)),
    updateOneBlogComment: compose(parseCommentInput)(updateOne(resolversConfig)),
  },
};
