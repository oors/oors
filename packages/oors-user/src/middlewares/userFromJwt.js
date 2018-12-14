import { ObjectID as objectId } from 'mongodb';

export default {
  id: 'userFromJwt',
  factory: () => async (req, res, next) => {
    const UserRepository = req.modules.get('oors.mongodb').getRepository('oors.user.User');
    const AccountRepository = req.modules.get('oors.mongodb').getRepository('oors.user.Account');
    const { User } = req.modules.get('oors.user');

    if (!req.jwtPayload) {
      return next();
    }

    try {
      const { id } = req.jwtPayload;
      const user = await UserRepository.findById(objectId(id));

      if (!user) {
        return next();
      }

      const account = await AccountRepository.findById(user.accountId);

      await User.canLogin({ user, account });
      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  },
};
