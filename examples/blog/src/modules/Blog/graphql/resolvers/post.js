import set from 'lodash/set';
import {
  withArgs,
  withSchema,
  compose,
} from '../../../../../../../packages/oors-graphql/src/decorators';
import { createCRUDResolvers } from '../../../../../../../packages/oors-mongodb/src/libs/graphql';
import PostRepository from '../../repositories/Post';

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

const validateFindQuery = withSchema({
  type: 'object',
  properties: {
    query: {
      type: 'object',
      properties: {
        categoryIds: {
          type: 'array',
          items: {
            isId: true,
          },
        },
        searchQuery: {
          type: 'string',
        },
        offset: {
          type: 'integer',
          minimum: 0,
          default: 0,
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 10,
        },
      },
      default: {},
    },
  },
});

// validating the properties for which GraphQL schema validation is insufficient
const validatePostInput = withSchema({
  type: 'object',
  properties: {
    input: {
      type: 'object',
      properties: {
        tags: {
          status: {
            type: 'string',
            enum: PostRepository.statuses, // making sure we only accept valid statuses
          },
          categoryId: {
            isId: true,
          },
        },
      },
    },
  },
});

const parsePostInput = withArgs(
  ({ input, id }, { user, loaders: { blog: { categories } } }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id, // user stamps
    },
    // if we have a categoryId, we need to make sure it points to an existing database entry
    category: input.categoryId ? resolve(categories.findById.load(input.categoryId)) : null,
  }),
);

const validateReferences = withSchema({
  type: 'object',
  properties: {
    category: {
      type: 'object',
    },
  },
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
