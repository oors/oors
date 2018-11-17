import Boom from 'boom';
import jwt from 'express-jwt';
import { ObjectID as objectId } from 'mongodb';
import { helpers } from 'oors-express';

const { createMiddleware } = helpers;

export default createMiddleware({
  id: 'jwt',
  factory: params => [
    jwt(params),
    async (req, res, next) => {
      const { User } = req.app.modules.get('oors.user');
      const UserRepository = req.app.modules.get('oors.user.repositories.User');
      const AccountRepository = req.app.modules.get('oors.user.repositories.Account');

      try {
        const { id } = req.jwtPayload;
        const user = await UserRepository.findById(objectId(id));
        const account = await AccountRepository.findById(user.accountId);

        const canLogin = await User.canLogin({
          user,
          account,
        });

        if (!canLogin) {
          throw Boom.unauthorized('Unable to find user!');
        }

        req.user = user;
      } catch (error) {
        return next(error);
      }

      return next();
    },
  ],
  params: {
    requestProperty: 'jwtPayload',
    getToken: req => req.headers.authorization || req.cookies.authToken,
  },
});
