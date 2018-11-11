import { deleteOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  deleteOne({
    repositoryName: 'oors.blog.Category',
  }),
);
