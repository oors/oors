import { Module } from 'oors';
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
        default: 'oors.mongoDb',
      },
    },
    required: ['jwtSecret', 'jwtConfig', 'rootURL'],
  };

  name = 'oors.user';

  hooks = {
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

  async setup({
    jwtSecret,
    jwtConfig,
    mockUserMiddlewarePivot,
    mockUserConfig,
    emailTemplates,
    rootURL,
    storageModule,
  }) {
    const [{ bindRepository }, { addRouter }, { Mail }, { addLoaders }] = await this.dependencies([
      storageModule,
      'oors.router',
      'oors.mailer',
      'oors.graphQL',
    ]);

    const routerConfig = {
      jwtMiddleware: this.jwtMiddleware,
    };

    const repositories = {
      UserRepository: bindRepository(new UserRepositoryClass()),
      AccountRepository: bindRepository(new AccountRepositoryClass()),
      UserLoginRepository: bindRepository(new UserLoginRepositoryClass()),
    };

    await this.createHook('touchRepositories', () => {}, { repositories });

    const { UserRepository, AccountRepository, UserLoginRepository } = repositories;

    const loaders = {
      users: addLoaders(createLoaders(UserRepository), 'users'),
      accounts: addLoaders(createLoaders(AccountRepository), 'accounts'),
      userLogins: addLoaders(createLoaders(UserLoginRepository), 'userLogins'),
    };

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
      ...repositories,
      loaders,
      User,
      Account,
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

    addRouter('userRouter', router(routerConfig));
  }
}

export default UserModule;
