import { updateOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  updateOne({
    repositoryName: 'oors.blog.Category',
  }),
);
