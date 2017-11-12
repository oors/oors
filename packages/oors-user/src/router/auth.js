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
      body: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
          },
          password: {
            type: 'string',
          },
        },
        required: ['username', 'password'],
      },
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

      const { user, token } = result;

      await UserLoginRepository.createOne({
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
      body: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          password: {
            type: 'string',
          },
        },
        required: ['username', 'name', 'email', 'password'],
      },
    }),
    wrapHandler(req => req.services.User.signup(req.body)),
  );

  router.post(
    '/reset-password',
    validate({
      body: {
        type: 'object',
        properties: {
          usernameOrEmail: {
            type: 'string',
          },
        },
        required: ['usernameOrEmail'],
      },
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
      body: {
        type: 'object',
        properties: {
          password: {
            type: 'string',
          },
        },
        required: ['password'],
      },
      params: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
          },
        },
        required: ['token'],
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
    validate({
      body: {
        type: 'object',
        properties: {
          password: {
            type: 'string',
          },
          oldPassword: {
            type: 'string',
          },
        },
        required: ['password, oldPassword'],
      },
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
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          username: {
            type: 'string',
          },
        },
      },
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
