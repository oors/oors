import { findOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';

export default findOne({
  getRepository: 'blogPost',
  getLoaders: ({ loaders }) => loaders.blogPosts,
});
