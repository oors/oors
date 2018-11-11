import { createOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  createOne({
    repositoryName: 'oors.blog.Category',
  }),
);
