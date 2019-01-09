import { compose, withUser } from 'oors-graphql/build/decorators';

/**
 * oldPassword is not required if the user signed up with a social account
 */
export default compose(withUser())(
  async (_, { oldPassword, password }, { modules, user, fromMongo }) => {
    if (user.password && !oldPassword) {
      throw new Error(`oldPassword is required!`);
    }

    return fromMongo(
      await modules.get('oors.user').changePassword({
        userId: user._id,
        oldPassword,
        password,
      }),
    );
  },
);
