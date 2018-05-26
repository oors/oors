import {
  withArgs,
  withSchema,
} from '../../../../../../../../packages/oors-graphql/build/decorators';
import PostRepository from '../../../repositories/Post';

export const validateFindQuery = withSchema({
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
export const validatePostInput = withSchema({
  type: 'object',
  properties: {
    input: {
      type: 'object',
      properties: {
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
});

export const parsePostInput = withArgs(
  ({ input, id }, { user, loaders: { blog: { categories } } }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id, // user stamps
    },
    // if we have a categoryId, we need to make sure it points to an existing database entry
    category: input.categoryId ? resolve(categories.findById.load(input.categoryId)) : null,
  }),
);

export const validateReferences = withSchema({
  type: 'object',
  properties: {
    category: {
      type: 'object',
    },
  },
});
