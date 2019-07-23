import crypto from 'crypto';
import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import upperFirst from 'lodash/upperFirst';
import omitBy from 'lodash/omitBy';
import isNil from 'lodash/isNil';
import camelCase from 'lodash/camelCase';
import ms from 'ms';
import moment from 'moment';
import { isMiddlewarePivot } from 'oors-express/build/validators';
import withSoftDelete from 'oors-mongodb/build/decorators/withSoftDelete';
import jwt from 'jsonwebtoken';
import Boom from 'boom';
import * as gqlMiddlewares from './graphql/middlewares';
import jwtMiddleware from './middlewares/jwt';
import passportInitialize from './middlewares/passportInitialize';
import passportSession from './middlewares/passportSession';
import passportFactory from './libs/passport';
import mockUser from './middlewares/mockUser';
import PermissionsManager from './libs/PermissionsManager';
import { roles as defaultRoles } from './constants/user';
import userFromJwtMiddleware from './middlewares/userFromJwt';
import { hashPassword as defaultHashPassword } from './libs/helpers';
import FailedLogin from './errors/FailedLogin';

class UserModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      jwtSecret: [v.isRequired(), v.isString()],
      jwtConfig: [v.isRequired(), v.isObject()],
      passportMiddlewarePivot: isMiddlewarePivot(),
      mockUserMiddlewarePivot: isMiddlewarePivot(),
      jwtMiddlewarePivot: isMiddlewarePivot(),
      mockUserConfig: [
        v.isDefault({}),
        v.isSchema({
          path: [v.isDefault('/'), v.isString()],
          enabled: [v.isDefault(false), v.isBoolean()],
          params: [v.isDefault({}), v.isObject()],
        }),
      ],
      passportConfig: [
        v.isDefault({}),
        v.isSchema({
          enabled: [v.isDefault(false), v.isBoolean()],
        }),
      ],
      hashPassword: [v.isDefault(defaultHashPassword), v.isFunction()],
      resetPasswordTokenExpiresIn: [v.isDefault('1d'), v.isAny(v.isString(), v.isNumber())],
      lockable: [
        v.isDefault({}),
        v.isSchema({
          enabled: [v.isDefault(true), v.isBoolean()],
          maxFailedAttempts: [v.isDefault(5), v.isNumber()],
        }),
      ],
      loginTokenExpiresIn: [v.isDefault('1d'), v.isAny(v.isString(), v.isNumber())],
      roles: [v.isDefault(defaultRoles), v.isArray(v.isString())],
    }),
  );

  static defaultConfig = {
    'oors.mongodb': {
      repositories: {
        collectionPrefix: 'user',
      },
    },
    'oors.rad': {
      autoload: {
        services: false,
      },
    },
  };

  name = 'oors.user';

  initialize({ jwtSecret }) {
    this.jwtMiddleware = {
      ...jwtMiddleware,
      params: {
        ...jwtMiddleware.params,
        secret: jwtSecret,
      },
    };

    this.configureSeeder();
  }

  async setup({ mockUserMiddlewarePivot, jwtMiddlewarePivot, mockUserConfig, hashPassword }) {
    await this.loadDependencies(['oors.mongodb', 'oors.router', 'oors.graphql', 'oors.express']);

    const { User, Account } = this.get('repositories');
    withSoftDelete()(User);
    withSoftDelete()(Account);

    User.validators.push(v.isProperty('roles', v.isArray(v.isOneOf(this.getConfig('roles')))));

    this.setupPermissions();

    this.export({
      gqlMiddlewares,
      jwtMiddleware: this.jwtMiddleware,
      hashPassword,
    });

    this.configurePassport();

    this.deps['oors.express'].middlewares.insert(
      jwtMiddlewarePivot,
      this.jwtMiddleware,
      userFromJwtMiddleware,
    );

    if (mockUserConfig.enabled) {
      this.deps['oors.express'].middlewares.insert(mockUserMiddlewarePivot, {
        ...mockUser,
        ...mockUserConfig,
      });
    }

    this.exportProperties([
      'login',
      'canLogin',
      'checkPassword',
      'tryLogin',
      'signup',
      'changePassword',
      'recoverPassword',
      'resetPassword',
      'socialLogin',
      'createToken',
      'findLockedUsers',
      'loginWithToken',
    ]);
  }

  configureSeeder() {
    this.addHook('oors.mongodb', 'configureSeeder', ({ seeder }) => {
      const { User, Account } = this.get('repositories');
      seeder.addResolver('users', User.createOne.bind(User), {
        account: 'accounts',
      });
      seeder.addResolver('accounts', Account.createOne.bind(Account));
    });
  }

  configurePassport() {
    const { User } = this.get('repositories');
    const { passportConfig, passportMiddlewarePivot, jwtSecret } = this.getConfig();

    if (!passportConfig.enabled) {
      return false;
    }

    const passport = passportFactory({
      jwtSecret,
      User,
      canLogin: this.canLogin,
      login: this.login,
    });

    this.deps['oors.express'].middlewares.insert(
      passportMiddlewarePivot,
      passportInitialize,
      passportSession,
    );

    this.export({ passport });

    return passport;
  }

  setupPermissions() {
    this.permissions = new PermissionsManager();
    this.export({
      permissions: this.permissions,
    });

    this.getConfig('roles').forEach(role => {
      this.permissions.define(
        `is${upperFirst(camelCase(role))}`,
        user => (user.roles || []).includes(role),
        {
          description: `User "${role}" role`,
        },
      );
    });

    this.deps['oors.graphql'].extendContext(context => {
      Object.assign(context, {
        permissionsManager: this.permissions,
      });
    });
  }

  createToken = (user, options = {}) =>
    jwt.sign(this.serializeUser(user), this.getConfig('jwtSecret'), {
      ...this.getConfig('jwtConfig'),
      ...options,
    });

  serializeUser = data => ({
    id: data._id.toString(),
    username: data.username,
    accountId: data.accountId.toString(),
    roles: data.roles,
  });

  login = async ({ username, password }) => {
    const { User } = this.get('repositories');

    const user = await User.findOneByUsername(username);

    if (!user) {
      throw new FailedLogin('User not found!');
    }

    await this.canLogin(user);

    if (
      this.getConfig('lockable.enabled') &&
      user.failedLoginAttempts &&
      user.failedLoginAttempts > this.getConfig('lockable.maxFailedAttempts')
    ) {
      throw new FailedLogin('User is locked because of failed login attempts!');
    }

    const isValidPassword = await this.checkPassword({ user, password });

    if (!isValidPassword) {
      if (this.getConfig('lockable.enabled')) {
        await User.updateOne({
          query: {
            _id: user._id,
          },
          update: {
            $inc: {
              failedLoginAttempts: 1,
            },
          },
        });
      }

      throw new FailedLogin('Incorrect password!');
    }

    return this.tryLogin(user);
  };

  loginWithToken = async token => {
    const { User } = this.get('repositories');
    const user = await User.findOne({
      query: {
        'login.token': token,
        'login.createdAt': {
          $gte: moment()
            .subtract(ms(this.getConfig('loginTokenExpiresIn')))
            .toDate(),
        },
      },
    });

    if (!user) {
      throw new FailedLogin('User not found!');
    }

    await this.canLogin(user);

    return this.tryLogin(user);
  };

  canLogin = async user => {
    if (user.isDeleted) {
      throw new FailedLogin('User not found!');
    }

    if (!user.isActive) {
      throw new FailedLogin('User is not active!');
    }

    const account =
      user.account || (await this.get('repositories').Account.findById(user.accountId));

    if (!account) {
      throw new FailedLogin('Unable to find user account!');
    }

    if (!account.confirmation.isCompleted) {
      throw new FailedLogin('Account is not confirmed!');
    }

    if (!account.isActive) {
      throw new FailedLogin('Account is not active!');
    }
  };

  checkPassword = async ({ password, user }) => {
    if (!user.password) {
      return false;
    }

    const hashedPassword = await this.getConfig('hashPassword')(password, user.salt);

    return user.password === hashedPassword;
  };

  tryLogin = async user => {
    const { User } = this.get('repositories');
    const updatedUser = await User.updateOne({
      query: {
        _id: user._id,
      },
      update: {
        $set: {
          lastLogin: new Date(),
          resetPassword: {},
          failedLoginAttempts: 0,
          login: {},
        },
      },
    });
    const token = await this.createToken(updatedUser);

    return {
      user: updatedUser,
      token,
    };
  };

  changePassword = async ({ userId, oldPassword, password }) => {
    const { User } = this.get('repositories');
    const user = await User.findById(userId);

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    await this.canLogin(user);

    if (user.password && !this.checkPassword({ password: oldPassword, user })) {
      throw Boom.badRequest('Invalid password!');
    }

    if (user.password && this.checkPassword({ password, user })) {
      throw Boom.badRequest("You can't use the same password!");
    }

    return User.updatePassword({
      userId: user._id,
      password: await this.getConfig('hashPassword')(password, user.salt),
    });
  };

  recoverPassword = async ({ password, token }) => {
    const { User } = this.get('repositories');
    const user = await User.findOne({
      query: {
        'resetPassword.token': token,
        'resetPassword.resetAt': {
          $gt: moment()
            .subtract(ms(this.getConfig('resetPasswordTokenExpiresIn')))
            .toDate(),
        },
      },
    });

    if (!user) {
      throw Boom.badRequest('Token not found!');
    }

    await this.canLogin(user);

    const hashedPassword = await this.getConfig('hashPassword')(password, user.salt);

    if (hashedPassword === user.password) {
      throw Boom.badRequest("You can't use the same password!");
    }

    return User.updatePassword({
      userId: user._id,
      password: hashedPassword,
    });
  };

  signup = async data => {
    const { User, Account } = this.get('repositories');
    const { username, email } = data;
    const existingUser = await User.findOneByUsernameOrEmail({
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

    const account = await Account.createOne({
      confirmation: {
        token: crypto.randomBytes(20).toString('hex'),
      },
    });

    const user = await User.createOne({
      accountId: account._id,
      ...data,
      isOwner: true,
    });

    this.asyncEmit('signup', { user, account });

    user.account = account;

    return user;
  };

  resetPassword = async usernameOrEmail => {
    const { User } = this.get('repositories');
    const user = await User.findOneByUsername(usernameOrEmail);

    if (!user) {
      throw Boom.badRequest('User not found!');
    }

    await this.canLogin(user);

    const updatedUser = await User.resetPassword(user._id);

    this.asyncEmit('resetPassword', updatedUser);

    return updatedUser;
  };

  socialLogin = async (
    { req, accessToken, refreshToken, profile },
    parseProfile = ({ displayName, username }) => ({
      name: displayName,
      username,
    }),
  ) => {
    const { User, Account, Login } = this.get('repositories');
    const email =
      Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : undefined;
    const matchesProfileId = { [`authProviders.${profile.provider}.id`]: profile.id };
    const query = email
      ? {
          $or: [
            matchesProfileId,
            {
              email,
            },
          ],
        }
      : matchesProfileId;

    let user = await User.findOne({
      query,
    });

    if (!user) {
      const account = await Account.createOne({
        confirmation: {
          isCompleted: true,
        },
      });

      user = await User.createOne({
        accountId: account._id,
        isOwner: true,
        authProviders: {
          [profile.provider]: {
            id: profile.id,
            accessToken,
            refreshToken,
            createdAt: new Date(),
          },
        },
        email,
        ...parseProfile(profile),
      });
    } else {
      user = await User.updateOne({
        query: {
          _id: user._id,
        },
        update: {
          $set: omitBy(
            {
              [`authProviders.${profile.provider}.accessToken`]: accessToken,
              [`authProviders.${profile.provider}.refreshToken`]: refreshToken,
              [`authProviders.${profile.provider}.updatedAt`]: new Date(),
            },
            isNil,
          ),
        },
      });
    }

    await this.canLogin(user);

    if (req) {
      await Login.createOne({
        userId: user._id,
        ip: req.IP,
        browser: req.useragent.browser,
        os: req.useragent.os,
        platform: req.useragent.platform,
      });
    }

    return User.updateOne({
      query: {
        _id: user._id,
      },
      update: {
        $set: {
          lastLogin: new Date(),
        },
      },
    });
  };

  verify({ token }) {
    const { User } = this.get('repositories');

    // @TODO: - check if we need to specify maxAge as an option for jwt.verify
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.getConfig('jwtSecret'), async (err, decoded) => {
        if (err) {
          return reject(err);
        }

        try {
          const { id } = decoded;
          // @TODO: maybe load these 2 in an aggregate query
          const user = await User.findById(id);

          await this.canLogin(user);

          return resolve(user);
        } catch (error) {
          return reject(error);
        }
      });
    });
  }
}

export default UserModule;
