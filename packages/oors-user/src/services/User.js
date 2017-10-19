/* eslint-disable class-methods-use-this */
import Joi from 'joi';
import { ObjectID as objectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import pick from 'lodash/pick';
import bcrypt from 'bcryptjs';
import moment from 'moment';
import { decorators, ServiceContainer } from 'octobus.js';
import Boom from 'boom';
import { FailedLogin } from '../libs/errors';

const { service, withSchema } = decorators;

class User extends ServiceContainer {
  constructor({ jwtConfig, emailTemplates, rootURL }) {
    super();
    this.jwtConfig = jwtConfig;
    this.emailTemplates = emailTemplates;
    this.rootURL = rootURL;
  }

  setServiceBus(serviceBus) {
    super.setServiceBus(serviceBus);
    this.UserRepository = serviceBus.extract('UserRepository');
    this.AccountRepository = serviceBus.extract('AccountRepository');
    this.Mail = serviceBus.extract('oors.mailer.Mail');
  }

  @service()
  @withSchema({
    user: Joi.object().keys({
      id: Joi.string().required(),
      accountId: Joi.object(),
      username: Joi.string().required(),
      scope: Joi.array().default([]),
    }),
    options: Joi.object().default({}),
  })
  createToken({ options, user }) {
    return jwt.sign(user, this.jwtConfig.key, {
      ...this.jwtConfig.options,
      ...options,
    });
  }

  @service()
  @withSchema({
    username: Joi.string().required(),
    password: Joi.string().required(),
  })
  async login({ username, password }, { extract }) {
    const UserRepository = extract('UserRepository');
    const AccountRepository = extract('AccountRepository');
    const user = await UserRepository.findOneByUsername(username);

    if (!user) {
      throw new FailedLogin('User not found!');
    }

    const account = await AccountRepository.findById(user.accountId);

    await this.canLogin({ user, account });

    const isValidPassword = await this.checkPassword({ user, password });
    if (!isValidPassword) {
      throw new FailedLogin('Incorrect password!');
    }

    return this.tryLogin(user);
  }

  @service()
  async canLogin({ user, account }) {
    if (!account) {
      throw new FailedLogin('Unable to find user account!');
    }

    if (user.isDeleted) {
      throw new FailedLogin('User not found!');
    }

    if (!user.isActive) {
      throw new FailedLogin('User is not active!');
    }

    if (!account.isConfirmed) {
      throw new FailedLogin('Account is not confirmed!');
    }

    if (!account.isActive) {
      throw new FailedLogin('Account is not active!');
    }

    return account;
  }

  @service()
  async checkPassword({ password, user }) {
    const hashedPassword = await this.hashPassword({
      password,
      salt: user.salt,
    });

    return user.password === hashedPassword;
  }

  @service()
  async tryLogin(user, { extract }) {
    const UserRepository = extract('UserRepository');
    const updatedUser = await UserRepository.replaceOne({
      ...user,
      lastLogin: new Date(),
    });

    const token = await this.createToken({
      user: await this.serialize(updatedUser),
    });

    return {
      ...updatedUser,
      token,
    };
  }

  @service()
  dump(data) {
    return pick(data, [
      'accountId',
      'username',
      'firstName',
      'lastName',
      'email',
      '_id',
      'updatedAt',
      'createdAt',
      'token',
      'isActive',
      'lastLogin',
      'roles',
    ]);
  }

  @service()
  serialize(data) {
    return {
      id: data._id.toString(),
      username: data.username,
      accountId: data.accountId,
      scope: data.roles,
    };
  }

  @service()
  @withSchema({
    userId: Joi.object().required(),
    oldPassword: Joi.string().required(),
    password: Joi.string().required(),
  })
  async changePassword({ userId, oldPassword, password }) {
    const user = await this.UserRepository.findById(userId);

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    const oldHashedPassword = await this.hashPassword({
      password: oldPassword,
      salt: user.salt,
    });

    if (oldHashedPassword !== user.password) {
      throw Boom.badRequest('Invalid password!');
    }

    const hashedPassword = await this.hashPassword({
      password,
      salt: user.salt,
    });

    if (hashedPassword === user.password) {
      throw Boom.badRequest("You can't use the same password!");
    }

    return this.UserRepository.updatePassword({
      userId: user._id,
      password: hashedPassword,
    });
  }

  @service()
  @withSchema({
    password: Joi.string().required(),
    token: Joi.string().required(),
  })
  async recoverPassword({ password, token }) {
    const user = await this.UserRepository.findOne({
      query: {
        'resetPassword.token': token,
      },
    });

    if (!user) {
      throw Boom.badRequest('Token not found!');
    }

    const hashedPassword = await this.hashPassword({
      password,
      salt: user.salt,
    });

    if (hashedPassword === user.password) {
      throw Boom.badRequest("You can't use the same password!");
    }

    const updateResult = await this.UserRepository.updatePassword({
      userId: user._id,
      password: hashedPassword,
    });

    return {
      user,
      updateResult,
    };
  }

  @service()
  async signup({ username, email }, { message }) {
    const existingUser = await this.UserRepository.findOneByUsernameOrEmail({
      username,
      email,
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw Boom.badRequest('Username already taken.');
      }

      if (existingUser.email === email) {
        throw Boom.badRequest('Email already taken.');
      }
    }

    const account = await this.AccountRepository.createOne({});

    const user = await this.UserRepository.createOne({
      accountId: account._id,
      ...message.data,
    });

    this.Mail.send({
      to: user.email,
      subject: 'welcome',
      template: this.emailTemplates.userSignUp,
      context: {
        user,
        account,
        rootURL: this.rootURL,
      },
    });

    return {
      user: pick(user, [
        'accountId',
        '_id',
        'title',
        'firstName',
        'lastName',
        'email',
        'username',
        'roles',
        'isActive',
        'createdAt',
        'updatedAt',
      ]),
      account: pick(account, ['isConfirmed', 'isActive', '_id', 'updatedAt', 'createdAt']),
    };
  }

  @service()
  async resetPassword(usernameOrEmail) {
    const user = await this.UserRepository.findOneByUsername(usernameOrEmail);

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    const updatedUser = await this.UserRepository.resetPassword(user._id);

    this.Mail.send({
      to: user.email,
      subject: 'forgot password',
      template: this.emailTemplates.forgotPassword,
      context: {
        user,
        resetPassword: updatedUser.resetPassword,
        rootURL: this.rootURL,
      },
    });

    return {
      user: {
        ...user,
        resetPassword: updatedUser.resetPassword,
      },
      updatedUser,
    };
  }

  @service()
  async socialLogin({ provider, token, expiresIn, profile }) {
    if (provider === 'google') {
      Object.assign(profile, {
        id: profile.raw.sub,
      });
    }

    const user = await this.UserRepository.findOne({
      query: {
        $or: [
          {
            [`socialLogin.${provider}.id`]: profile.id,
          },
          {
            email: profile.email,
          },
        ],
      },
    });

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    user.socialLogin[provider] = {
      id: profile.id,
      name: profile.displayName,
      email: profile.email,
      token,
      expiresAt: moment()
        .add(expiresIn, 'seconds')
        .toDate(),
    };

    const updatedUser = await this.UserRepository.replaceOne({
      ...user,
      lastLogin: new Date(),
    });

    const authToken = await this.createToken({
      id: user._id,
      username: user.username,
    });

    return {
      ...updatedUser,
      token: authToken,
    };
  }

  @service()
  hashPassword({ password, salt }) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(password, salt, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  }

  @service()
  verify({ token }, { extract }) {
    const UserRepository = extract('UserRepository');
    const AccountRepository = extract('AccountRepository');

    /**
     * TODO
     * check if we need to specify maxAge as an option for jwt.verify
     */
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtConfig.key, async (err, decoded) => {
        if (err) {
          return reject(err);
        }

        try {
          const { id } = decoded;
          const user = await UserRepository.findById(objectId(id));
          const account = await AccountRepository.findById(user.accountId);

          const canLogin = await User.canLogin({
            user,
            account,
          });

          if (!canLogin) {
            return reject(Boom.unauthorized('Unable to find user!'));
          }

          return resolve(user);
        } catch (error) {
          return reject(error);
        }
      });
    });
  }
}

export default User;
