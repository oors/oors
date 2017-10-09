import Joi from 'joi';
import { Router } from 'express';
import celebrate from 'celebrate';
import { helpers } from 'oors-router';
import pick from 'lodash/pick';
import Boom from 'boom';
import userSchema from '../schemas/user';
import { sanitizeUserData } from '../libs/helpers';
import { FailedLogin } from '../libs/errors';
import injectServices from '../middlewares/injectServices';

const { wrapHandler } = helpers;

export default ({ jwtMiddleware }) => {
  const router = Router();

  router.use(injectServices);

  router.post(
    '/login',
    celebrate({
      body: pick(userSchema, ['username', 'password']),
    }),
    wrapHandler(async (req, res) => {
      const { User, UserLoginRepository } = req.services;
      let result;
      try {
        result = await User.login(req.body);
      } catch (err) {
        if (err instanceof FailedLogin) {
          throw Boom.badRequest(err.message);
        }

        throw err;
      }

      await UserLoginRepository.createOne({
        userId: result._id,
        ip: req.ip,
        browser: req.useragent.browser,
        os: req.useragent.os,
        platform: req.useragent.platform,
      });

      res.cookie('authToken', result.token, {
        httpOnly: true,
      });

      return User.dump(result);
    }),
  );

  router.post(
    '/signup',
    celebrate({
      body: pick(userSchema, ['name', 'username', 'email', 'password']),
    }),
    wrapHandler(req => req.services.User.signup(req.body)),
  );

  router.post(
    '/reset-password',
    celebrate({
      body: {
        usernameOrEmail: Joi.string().required(),
      },
    }),
    wrapHandler(async req => {
      const { User } = req.services;
      const { user, updateResult } = await User.resetPassword(
        req.body.usernameOrEmail,
      );
      const curatedUser = await User.dump(user);
      return {
        user: curatedUser,
        updateResult,
      };
    }),
  );

  router.post(
    '/recover-password/:token',
    celebrate({
      body: {
        password: Joi.string().required(),
      },
      params: {
        token: Joi.string().required(),
      },
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
    celebrate({
      body: {
        oldPassword: Joi.string().required(),
        password: Joi.string().required(),
      },
    }),
    wrapHandler(req =>
      req.services.User.changePassword({
        ...req.body,
        userId: req.user._id,
      }),
    ),
  );

  router.get(
    '/me',
    jwtMiddleware,
    wrapHandler(async req => sanitizeUserData(req.user)),
  );

  router.post(
    '/me',
    jwtMiddleware,
    celebrate({
      body: pick(userSchema, ['name', 'username']),
    }),
    wrapHandler(async req => {
      await req.services.UserRepository.updateOne({
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
