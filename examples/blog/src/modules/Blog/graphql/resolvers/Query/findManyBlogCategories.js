import { findMany } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';

export default findMany({
  getRepository: 'blogCategory',
  getLoaders: ({ loaders }) => loaders.blogCategories,
});
