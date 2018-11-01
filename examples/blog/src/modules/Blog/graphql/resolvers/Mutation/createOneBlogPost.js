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
            isObjectId: true,
          },
        },
      },
    },
  }),
  withArgs((_, { input, id }, { user, loaders }, info, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id, // user stamps
    },
    // if we have a categoryId, we need to make sure it points to an existing database entry
    category: input.categoryId
      ? resolve(loaders.oorsBlogCategories.findById.load(input.categoryId))
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
    repositoryName: 'oors.blog.Post',
  }),
);
