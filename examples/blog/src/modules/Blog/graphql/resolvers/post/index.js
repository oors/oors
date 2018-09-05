import { compose } from '../../../../../../../../packages/oors-graphql/build/decorators';
import { createCRUDResolvers } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql';
import { validatePostInput, parsePostInput, validateReferences } from './decorators';

const resolvers = createCRUDResolvers({
  getRepository: 'blogPost',
  getLoaders: ({ loaders }) => loaders.blogPosts,
  // you can only delete and update your own posts posts
  canUpdate: (user, item) => user._id.toString() === item.createdBy.toString(),
  canDelete: (user, item) => user._id.toString() === item.createdBy.toString(),
});

export default {
  Query: {
    findManyBlogPosts: resolvers.findMany,
    findOneBlogPost: resolvers.findOne,
  },
  BlogPost: {
    author: (post, args, { loaders }) => loaders.users.findById.load(post.createdBy),
    updatedBy: (post, args, { loaders }) => post.updatedBy ? loaders.users.findById.load(post.updatedBy) : null,
    category: (post, args, { loaders }) => loaders.blogCategories.findById.load(post.categoryId),
    related: (post, args, { loaders }) => (post.relatedPostIds || []).length
      ? loaders.blogPosts.findMany.load({
        query: {
          _id: {
            $in: post.relatedPostIds,
          },
        },
      })
      : [],
    comments: (post, { offset = 0, limit = 10 }, { loaders }) => loaders.blogComments.findMany.load({
      query: {
        postId: post._id,
      },
      skip: parseInt(offset, 10) || 0,
      limit: Math.max(parseInt(limit, 10) || 10, 20),
      orderBy: {
        createdAt: 'desc',
      },
    }),
  },
  User: {
    blogPosts: (user, args, { loaders }) => loaders.blogPosts.findMany.load({
      query: {
        createdBy: user._id,
      },
    }),
  },
  Mutation: {
    createOneBlogPost: compose(
      validatePostInput,
      parsePostInput,
      validateReferences,
    )(resolvers.createOne),
    updateOneBlogPost: compose(
      validatePostInput,
      parsePostInput,
    )(resolvers.updateOne),
    deleteOneBlogPost: resolvers.deleteOne,
  },
};
