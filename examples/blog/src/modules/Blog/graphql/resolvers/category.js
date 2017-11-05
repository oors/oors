import { createCRUDResolvers } from '../../../../../../../packages/oors-mongodb/src/libs/graphql';
import { withArgs } from '../../../../../../../packages/oors-graphql/src/decorators';

/**
 * Generates a map of crud resolvers that map to the createOne, findOne, findMany, updateOne,
 * deleteOne methods of a Repository.
 * It needs two references:
 * - getRepository - the repository instance
 * - the loaders created for this repository (findById, findOne, findMany) - these were created in
 *   the bootstrap file of the module
 */
const resolvers = createCRUDResolvers({
  getRepository: ({ app }) => app.modules.get('oors.blog').CategoryRepository,
  getLoaders: ({ loaders }) => loaders.blog.categories,
});

export default {
  Query: {
    blogCategories: resolvers.findMany,
    blogCategory: resolvers.findOne,
  },
  BlogCategory: {
    posts: (category, args, { loaders }) =>
      loaders.blog.posts.findMany.load({
        query: {
          categoryId: category._id,
        },
      }),
  },
  Mutation: {
    createBlogCategory: withArgs(({ input }, { user }) => ({
      input: {
        ...input,
        createdBy: user._id, // making sure the item is user stamped
      },
    }))(resolvers.createOne),

    updateBlogCategory: withArgs(({ input }, { user }) => ({
      input: {
        ...input,
        updatedBy: user._id,
      },
    }))(resolvers.updateOne),

    deleteBlogCategory: resolvers.deleteOne,
  },
};
