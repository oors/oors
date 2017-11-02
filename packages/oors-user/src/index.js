import { Module } from 'oors';
import pivotSchema from 'oors/build/schemas/pivot';
import UserRepository from './repositories/User';
import AccountRepository from './repositories/Account';
import UserLoginRepository from './repositories/UserLogin';
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
  static configSchema = {
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
    const [{ bindRepository }, { addRouter }, { Mail }] = await this.dependencies([
      storageModule,
      'oors.router',
      'oors.mailer',
    ]);

    const routerConfig = {
      jwtMiddleware: this.jwtMiddleware,
    };

    const userRepository = bindRepository(new UserRepository());
    const accountRepository = bindRepository(new AccountRepository());
    const userLoginRepository = bindRepository(new UserLoginRepository());
    const User = new UserService({
      jwtConfig: {
        key: jwtSecret,
        options: jwtConfig,
      },
      emailTemplates,
      rootURL,
      UserRepository: userRepository,
      AccountRepository: accountRepository,
      Mail,
    });
    const Account = new AccountService({
      UserRepository: userRepository,
      AccountRepository: accountRepository,
      Mail,
    });

    this.export({
      UserRepository: userRepository,
      AccountRepository: accountRepository,
      UserLoginRepository: userLoginRepository,
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
