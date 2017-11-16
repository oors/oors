import set from 'lodash/set';
import { compose } from 'oors-graphql/build/decorators';
import { createCRUDResolvers } from 'oors-mongodb/build/libs/graphql';
import {
  validateFindQuery,
  validatePostInput,
  parsePostInput,
  validateReferences,
} from './decorators';

const resolvers = createCRUDResolvers({
  getRepository: ({ app }) => app.modules.get('oors.blog').PostRepository,
  getLoaders: ({ loaders }) => loaders.blog.posts,
  findManyQuery: ({ query: { categoryIds, offset, limit, searchQuery } }) => {
    const query = {
      orderBy: {
        createdAt: 'desc',
      },
    };

    if (categoryIds && categoryIds.length) {
      set(query, 'query.categoryId', {
        $in: categoryIds,
      });
    }

    if (offset) {
      query.skip = parseInt(offset, 10);
    }

    if (limit) {
      query.limit = parseInt(limit, 10);
    }

    if (searchQuery) {
      set(query, 'query.$text.$search', searchQuery);
    }

    return query;
  },
  // you can only delete and update your own posts posts
  canUpdate: (user, item) => user._id.toString() === item.createdBy.toString(),
  canDelete: (user, item) => user._id.toString() === item.createdBy.toString(),
});

export default {
  Query: {
    blogPosts: compose(validateFindQuery)(resolvers.findMany),
    blogPost: resolvers.findOne,
  },
  BlogPost: {
    author: (post, args, { loaders }) => loaders.users.findById.load(post.createdBy),
    updatedBy: (post, args, { loaders }) => loaders.users.findById.load(post.updatedBy),
    category: (post, args, { loaders }) => loaders.blog.categories.findById.load(post.categoryId),
    related: (post, args, { loaders }) =>
      loaders.blog.posts.findMany.load({
        query: {
          _id: {
            $in: post.relatedPostIds,
          },
        },
      }),
    comments: (post, { offset = 0, limit = 10 }, { loaders }) =>
      loaders.blog.comments.findMany.load({
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
    blogPosts: (user, args, { loaders }) =>
      loaders.blog.posts.findMany.load({
        query: {
          createdBy: user._id,
        },
      }),
  },
  Mutation: {
    createBlogPost: compose(validatePostInput, parsePostInput, validateReferences)(
      resolvers.createOne,
    ),
    updateBlogPost: compose(validatePostInput, parsePostInput)(resolvers.updateOne),
    deleteBlogPost: resolvers.deleteOne,
  },
};
