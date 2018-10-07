import { createOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import {
  compose,
  withArgs,
  withSchema,
} from '../../../../../../../../packages/oors-graphql/build/decorators';
import PostRepository from '../../../repositories/Post';

export default compose(
  withSchema({
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
  }),
  withArgs((_, { input, id }, { user, loaders }, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id, // user stamps
    },
    // if we have a categoryId, we need to make sure it points to an existing database entry
    category: input.categoryId
      ? resolve(loaders.blogCategories.findById.load(input.categoryId))
      : null,
  })),
  withSchema({
    type: 'object',
    properties: {
      category: {
        type: 'object',
      },
    },
  }),
)(
  createOne({
    repositoryName: 'blogPost',
  }),
);
