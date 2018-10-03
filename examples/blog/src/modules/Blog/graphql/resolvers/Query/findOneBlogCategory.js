import { findOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';

export default findOne({
  getRepository: 'blogCategory',
  getLoaders: ({ loaders }) => loaders.blogCategories,
});
