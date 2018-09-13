import { Module } from 'oors';
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import pivotSchema from 'oors/build/schemas/pivot';
import { createLoaders } from 'oors-mongodb/build/libs/graphql';
import UserRepositoryClass from './repositories/User';
import AccountRepositoryClass from './repositories/Account';
import UserLoginRepositoryClass from './repositories/UserLogin';
import UserService from './services/User';
import AccountService from './services/Account';
import router from './router';
import * as gqlMiddlewares from './graphql/middlewares';
import jwtMiddleware from './middlewares/jwt';
import passportInitialize from './middlewares/passportInitialize';
import passportSession from './middlewares/passportSession';
import passportFactory from './libs/passport';
import mockUser from './middlewares/mockUser';
import ForgotPasswordTemplate from './mailerTemplates/ForgotPassword';
import UserSignupTemplate from './mailerTemplates/UserSignup';
import PermissionsManager from './libs/PermissionsManager';
import { roles } from './constants/user';

class UserModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      jwtSecret: {
        type: 'string',
      },
      jwtConfig: {
        type: 'object',
      },
      passportMiddlewarePivot: pivotSchema,
      mockUserMiddlewarePivot: pivotSchema,
      mockUserConfig: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            default: '/',
          },
          enabled: {
            type: 'boolean',
            default: false,
          },
          params: {
            type: 'object',
            default: {},
          },
        },
        default: {},
      },
      passportConfig: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            default: false,
          },
        },
        default: {},
      },
      emailTemplates: {
        type: 'object',
        default: {},
      },
      rootURL: {
        type: 'string',
      },
      storageModule: {
        type: 'string',
        default: 'oors.mongodb',
      },
    },
    required: ['jwtSecret', 'jwtConfig', 'rootURL'],
  };

  name = 'oors.user';

  hooks = {
    'oors.graphql.buildContext': ({ context }) => {
      Object.assign(context, {
        permissionsManager: this.permissions,
      });
    },

    'oors.router.load': () => {},
  };

  initialize({ jwtSecret, emailTemplates }) {
    this.jwtMiddleware = jwtMiddleware({
      secret: jwtSecret,
    });

    this.config.emailTemplates = {
      forgotPassword: ForgotPasswordTemplate,
      userSignUp: UserSignupTemplate,
      ...emailTemplates,
    };
  }

  async setup({ mockUserMiddlewarePivot, mockUserConfig, storageModule }) {
    await this.loadDependencies([storageModule, 'oors.router', 'oors.mailer', 'oors.graphql']);

    const routerConfig = {
      jwtMiddleware: this.jwtMiddleware,
    };

    await this.setupRepositories();
    this.setupServices();
    this.setupPermissions();

    this.export({
      gqlMiddlewares,
      jwtMiddleware: this.jwtMiddleware,
    });

    this.configurePassport(routerConfig);

    if (mockUserConfig.enabled) {
      this.app.middlewares.insert(mockUserMiddlewarePivot, {
        ...mockUser,
        ...mockUserConfig,
      });
    }

    this.deps['oors.router'].addRouter('userRouter', router(routerConfig));
  }

  async setupRepositories() {
    const { bindRepository } = this.deps[this.getConfig('storageModule')];
    const { addLoaders } = this.deps['oors.graphql'];

    const repositories = {
      UserRepository: bindRepository(new UserRepositoryClass()),
      AccountRepository: bindRepository(new AccountRepositoryClass()),
      UserLoginRepository: bindRepository(new UserLoginRepositoryClass()),
    };

    await this.runHook('touchRepositories', () => {}, { repositories });

    const { UserRepository, AccountRepository, UserLoginRepository } = repositories;

    const loaders = {
      users: addLoaders(createLoaders(UserRepository), 'users'),
      accounts: addLoaders(createLoaders(AccountRepository), 'accounts'),
      userLogins: addLoaders(createLoaders(UserLoginRepository), 'userLogins'),
    };

    this.export({
      repositories,
      loaders,
    });
  }

  configurePassport(routerConfig) {
    const { passportConfig, passportMiddlewarePivot, jwtSecret } = this.getConfig();

    if (!passportConfig.enabled) {
      return;
    }

    const passport = passportFactory({ jwtSecret });
    this.app.middlewares.insert(passportMiddlewarePivot, passportInitialize, passportSession);
    this.export({ passport });
    Object.assign(routerConfig, { passport });
  }

  setupServices() {
    const { jwtSecret, jwtConfig, emailTemplates, rootURL } = this.getConfig();
    const { UserRepository, AccountRepository } = this.get('repositories');
    const { Mail } = this.deps['oors.mailer'];

    const User = new UserService({
      jwtConfig: {
        key: jwtSecret,
        options: jwtConfig,
      },
      emailTemplates,
      rootURL,
      UserRepository,
      AccountRepository,
      Mail,
    });

    const Account = new AccountService({
      UserRepository,
      AccountRepository,
      Mail,
    });

    this.export({
      User,
      Account,
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
  }
}

export default UserModule;
