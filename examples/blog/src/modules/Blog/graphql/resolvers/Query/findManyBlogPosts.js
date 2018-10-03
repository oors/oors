import { findMany } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';

export default findMany({
  getRepository: 'blogPost',
  getLoaders: ({ loaders }) => loaders.blogPosts,
});
