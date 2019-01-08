import { ObjectID as objectId } from 'mongodb';

export default {
  id: 'userFromJwt',
  factory: () => async (req, res, next) => {
    const User = req.modules.get('oors.mongodb').getRepository('oors.user.User');

    if (!req.jwtPayload) {
      return next();
    }

    try {
      const { id } = req.jwtPayload;
      const user = await User.findById(objectId(id));

      if (!user) {
        return next();
      }

      await req.modules.get('oors.user').canLogin(user);

      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  },
};
