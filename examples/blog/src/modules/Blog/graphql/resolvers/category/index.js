import {
  findMany,
  findOne,
  createOne,
  updateOne,
  deleteOne,
} from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

/**
 * Generates a map of crud resolvers that map to the createOne, findOne, findMany, updateOne,
 * deleteOne methods of a Repository.
 * It needs two references:
 * - getRepository - the repository instance
 * - the loaders created for this repository (findById, findOne, findMany) - these were created in
 *   the bootstrap file of the module
 */

const resolversConfig = {
  getRepository: 'blogCategory',
  getLoaders: ({ loaders }) => loaders.blogCategories,
};

export default {
  Query: {
    findManyBlogCategories: findMany(resolversConfig),
    findOneBlogCategory: findOne(resolversConfig),
  },
  BlogCategory: {
    posts: (category, args, { loaders }) => loaders.blogPosts.findMany.load({
      query: {
        categoryId: category._id,
      },
    }),
  },
  Mutation: {
    createOneBlogCategory: withUserStamps(createOne(resolversConfig)),
    updateOneBlogCategory: withUserStamps(updateOne(resolversConfig)),
    deleteOneBlogCategory: deleteOne(resolversConfig),
  },
};
