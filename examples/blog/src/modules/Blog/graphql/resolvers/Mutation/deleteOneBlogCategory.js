import { deleteOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  deleteOne({
    getRepository: 'blogCategory',
    getLoaders: ({ loaders }) => loaders.blogCategories,
  }),
);
