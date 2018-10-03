import { updateOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  updateOne({
    getRepository: 'blogCategory',
    getLoaders: ({ loaders }) => loaders.blogCategories,
  }),
);
