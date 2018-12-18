import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import { isMiddlewarePivot } from 'oors-express/build/validators';
import withSoftDelete from 'oors-mongodb/build/decorators/withSoftDelete';
import UserService from './services/User';
import router from './router';
import * as gqlMiddlewares from './graphql/middlewares';
import jwtMiddleware from './middlewares/jwt';
import passportInitialize from './middlewares/passportInitialize';
import passportSession from './middlewares/passportSession';
import passportFactory from './libs/passport';
import mockUser from './middlewares/mockUser';
import PermissionsManager from './libs/PermissionsManager';
import { roles } from './constants/user';
import userFromJwtMiddleware from './middlewares/userFromJwt';

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
    }),
  );

  static defaultConfig = {
    oors: {
      mongodb: {
        repositories: {
          autoload: true,
        },
      },
      rad: {
        autoload: {
          services: false,
        },
      },
    },
  };

  name = 'oors.user';

  hooks = {
    'oors.router.load': () => {},
  };

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

  async setup({ mockUserMiddlewarePivot, jwtMiddlewarePivot, mockUserConfig }) {
    await this.loadDependencies(['oors.mongodb', 'oors.router', 'oors.graphql', 'oors.express']);

    const { User, Account } = this.get('repositories');
    withSoftDelete()(User);
    withSoftDelete()(Account);

    this.setupServices();
    this.setupPermissions();

    this.export({
      gqlMiddlewares,
      jwtMiddleware: this.jwtMiddleware,
    });

    const passport = this.configurePassport();

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

    const userRouter = router({
      jwtMiddleware,
      passport,
    });

    this.deps['oors.router'].addRouter('userRouter', userRouter);
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
    const { passportConfig, passportMiddlewarePivot, jwtSecret } = this.getConfig();

    if (!passportConfig.enabled) {
      return false;
    }

    const passport = passportFactory({ jwtSecret });

    this.deps['oors.express'].middlewares.insert(
      passportMiddlewarePivot,
      passportInitialize,
      passportSession,
    );

    this.export({ passport });

    return passport;
  }

  setupServices() {
    const { jwtSecret, jwtConfig } = this.getConfig();
    const AccountRepository = this.get('repositories.Account');
    const UserRepository = this.get('repositories.User');

    const User = new UserService({
      jwtConfig: {
        key: jwtSecret,
        options: jwtConfig,
      },
      UserRepository,
      AccountRepository,
      onSignup: data => this.asyncEmit('signup', data),
      onResetPassword: data => this.asyncEmit('resetPassword', data),
    });

    this.export({
      User,
    });
  }

  setupPermissions() {
    this.permissions = new PermissionsManager();
    this.export({
      permissions: this.permissions,
    });

    roles.forEach(role => {
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
}

export default UserModule;
