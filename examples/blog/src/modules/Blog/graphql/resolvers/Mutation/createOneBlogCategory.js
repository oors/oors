import { createOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  createOne({
    getRepository: 'blogCategory',
    getLoaders: ({ loaders }) => loaders.blogCategories,
  }),
);
