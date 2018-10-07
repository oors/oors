import { deleteOne } from '../../../../../../../../packages/oors-mongodb/build/libs/graphql/createResolvers';
import { withUserStamps } from '../../decorators';

export default withUserStamps(
  deleteOne({
    repositoryName: 'blogCategory',
  }),
);
