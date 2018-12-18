/* eslint-disable class-methods-use-this */
import invariant from 'invariant';
import { ObjectID as objectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import pick from 'lodash/pick';
import moment from 'moment';
import Boom from 'boom';
import { FailedLogin } from '../libs/errors';
import { hashPassword } from '../libs/helpers';
import { roles } from '../constants/user';

class User {
  constructor({ jwtConfig, UserRepository, AccountRepository, onSignup, onResetPassword }) {
    this.UserRepository = UserRepository;
    this.AccountRepository = AccountRepository;
    this.jwtConfig = jwtConfig;
    this.onSignup = onSignup;
    this.onResetPassword = onResetPassword;
  }

  createToken(user, options = {}) {
    return jwt.sign(this.serialize(user), this.jwtConfig.key, {
      ...this.jwtConfig.options,
      ...options,
    });
  }

  async login({ username, password }) {
    invariant(typeof username === 'string' && username, 'Username is required');
    invariant(typeof password === 'string' && password, 'Password is required');

    const { UserRepository, AccountRepository } = this;

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

  async doLogin(user) {
    await this.canLogin(user);
    return this.tryLogin(user);
  }

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
  }

  async checkPassword({ password, user }) {
    if (!user.password) {
      return false;
    }

    const hashedPassword = await hashPassword({
      password,
      salt: user.salt,
    });

    return user.password === hashedPassword;
  }

  async tryLogin(user) {
    const updatedUser = await this.UserRepository.updateOne({
      query: {
        _id: user._id,
      },
      update: {
        $set: {
          lastLogin: new Date(),
        },
      },
    });

    const token = await this.createToken(updatedUser);

    return {
      user: updatedUser,
      token,
    };
  }

  dump(userData) {
    return pick(userData, [
      'accountId',
      'username',
      'name',
      'email',
      '_id',
      'updatedAt',
      'createdAt',
      'isActive',
      'lastLogin',
      'roles',
    ]);
  }

  serialize(data) {
    return {
      id: data._id.toString(),
      username: data.username,
      accountId: data.accountId.toString(),
      roles: data.roles,
    };
  }

  async changePassword({ userId, oldPassword, password } = {}) {
    invariant(userId, 'User id is required!');
    invariant(
      typeof oldPassword === 'string' && oldPassword,
      'Previously set password is required!',
    );
    invariant(typeof password === 'string' && password, 'Password is required!');

    const user = await this.UserRepository.findById(userId);

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    const oldHashedPassword = await hashPassword({
      password: oldPassword,
      salt: user.salt,
    });

    if (oldHashedPassword !== user.password) {
      throw Boom.badRequest('Invalid password!');
    }

    const hashedPassword = await hashPassword({
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

  async recoverPassword({ password, token } = {}) {
    invariant(typeof password === 'string' && password, 'Password is required!');
    invariant(typeof token === 'string' && token, 'Token is required!');

    const user = await this.UserRepository.findOne({
      query: {
        'resetPassword.token': token,
      },
    });

    if (!user) {
      throw Boom.badRequest('Token not found!');
    }

    const hashedPassword = await hashPassword({
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

  async signup(data) {
    const { username, email } = data;
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
      ...data,
      isOwner: true,
    });

    await this.onSignup({ user, account });

    return { user, account };
  }

  async resetPassword(usernameOrEmail) {
    invariant(
      typeof usernameOrEmail === 'string' && usernameOrEmail,
      'Username or email is required!',
    );

    const user = await this.UserRepository.findOneByUsername(usernameOrEmail);

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    const updatedUser = await this.UserRepository.resetPassword(user._id);

    await this.onResetPassword(updatedUser);

    return updatedUser;
  }

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

    const authToken = await this.createToken(updatedUser);

    return {
      ...updatedUser,
      token: authToken,
    };
  }

  verify({ token }) {
    const { UserRepository, AccountRepository } = this;

    // @TODO: - check if we need to specify maxAge as an option for jwt.verify
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtConfig.key, async (err, decoded) => {
        if (err) {
          return reject(err);
        }

        try {
          const { id } = decoded;
          // @TODO: maybe load these 2 in an aggregate query
          const user = await UserRepository.findById(objectId(id));
          const account = await AccountRepository.findById(user.accountId);

          await this.canLogin({
            user,
            account,
          });

          return resolve(user);
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  is(user, role) {
    if (!roles.includes(role)) {
      throw new Error(`Unknown role - "${role}"!`);
    }

    return user.roles.includes(role);
  }
}

export default User;
