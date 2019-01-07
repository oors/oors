import { validators as v } from 'easevalidation';
import { compose, withValidator } from 'oors-graphql/build/decorators';
import isObjectId from 'oors-mongodb/build/libs/isObjectId';

export default compose(
  withValidator(
    v.isSchema({
      userId: isObjectId(),
    }),
  ),
)(async (_, { userId, oldPassword, password }, { modules, fromMongo }) =>
  fromMongo(
    await modules.get('oors.user').changePassword({
      userId,
      oldPassword,
      password,
    }),
  ),
);
