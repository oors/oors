import pick from 'lodash/pick';
import { validators as v } from 'easevalidation';
import { Router } from 'express';
import { helpers } from 'oors-router';
import Boom from 'boom';
import validate from 'oors-router/build/middlewares/validate';
import { sanitizeUserData } from '../libs/helpers';
import { FailedLogin } from '../libs/errors';
import injectServices from '../middlewares/injectServices';

const { wrapHandler } = helpers;

export default ({ jwtMiddleware }) => {
  const router = Router();

  router.use(injectServices);

  router.post(
    '/login',
    validate({
      body: v.isSchema({
        username: [v.isRequired(), v.isString()],
        password: [v.isRequired(), v.isString()],
      }),
    }),
    wrapHandler(async (req, res) => {
      const { User } = req.services;
      const LoginRepository = req.services['repositories.Login'];
      let result;

      try {
        result = await User.login(req.body);
      } catch (err) {
        if (err instanceof FailedLogin) {
          throw Boom.badRequest(err.message);
        }

        throw err;
      }

      const { user, token } = result;

      await LoginRepository.createOne({
        userId: user._id,
        ip: req.ip,
        browser: req.useragent.browser,
        os: req.useragent.os,
        platform: req.useragent.platform,
      });

      res.cookie('authToken', token, {
        httpOnly: true,
      });

      return {
        user: User.dump(user),
        token,
      };
    }),
  );

  router.post(
    '/signup',
    validate({
      body: v.isSchema({
        username: [v.isRequired(), v.isString()],
        name: [v.isRequired(), v.isString()],
        email: [v.isRequired(), v.isString(), v.isEmail()],
        password: [v.isRequired(), v.isString()],
      }),
    }),
    wrapHandler(async req => {
      const { user, account } = await req.services.User.signup(req.body);

      return {
        user: pick(user, [
          'accountId',
          '_id',
          'title',
          'name',
          'email',
          'username',
          'roles',
          'isActive',
          'createdAt',
          'updatedAt',
        ]),
        account: pick(account, ['isConfirmed', 'isActive', '_id', 'updatedAt', 'createdAt']),
      };
    }),
  );

  router.post(
    '/reset-password',
    validate({
      body: v.isSchema({
        usernameOrEmail: [v.isRequired(), v.isString()],
      }),
    }),
    wrapHandler(async req => {
      const { User } = req.services;
      const { user, updateResult } = await User.resetPassword(req.body.usernameOrEmail);
      const curatedUser = await User.dump(user);
      return {
        user: curatedUser,
        updateResult,
      };
    }),
  );

  router.post(
    '/recover-password/:token',
    validate({
      body: v.isSchema({
        password: [v.isRequired(), v.isString()],
      }),
      params: v.isSchema({
        token: [v.isRequired(), v.isString()],
      }),
    }),
    wrapHandler(async req => {
      const { User } = req.services;
      const { password } = req.body;
      const { token } = req.params;
      const { user, updateResult } = await User.recoverPassword({
        password,
        token,
      });
      const curatedUser = await User.dump(user);
      return {
        user: curatedUser,
        updateResult,
      };
    }),
  );

  router.post(
    '/change-password',
    jwtMiddleware,
    validate({
      body: v.isSchema({
        password: [v.isRequired(), v.isString()],
        oldPassword: [v.isRequired(), v.isString()],
      }),
    }),
    wrapHandler(req =>
      req.services.User.changePassword({
        ...req.body,
        userId: req.user._id,
      }),
    ),
  );

  router.get('/me', jwtMiddleware, wrapHandler(async req => sanitizeUserData(req.user)));

  router.post(
    '/me',
    jwtMiddleware,
    validate({
      body: v.isSchema({
        name: v.isAny(v.isUndefined(), v.isString()),
        username: v.isAny(v.isUndefined(), v.isString()),
      }),
    }),
    wrapHandler(async req => {
      await req.services['repositories.User'].updateOne({
        query: {
          _id: req.user._id,
        },
        update: {
          $set: req.body,
        },
      });

      return sanitizeUserData({
        ...req.user,
        ...req.body,
      });
    }),
  );

  return router;
};
