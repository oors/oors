import { validators as v } from 'easevalidation';
import { compose, withValidator } from 'oors-graphql/build/decorators';

export default compose(
  withValidator(
    v.isSchema({
      email: v.isEmail(),
    }),
  ),
)(async (_, args, { fromMongo, modules }) =>
  fromMongo(await modules.get('oors.user').signup(args)),
);
