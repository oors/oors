import path from 'path';
import randomstring from 'randomstring';
import Config from '../../../packages/oors-config';
import MemoryStore from '../../../packages/oors-config/src/stores/Memory';
import ENVStore from '../../../packages/oors-config/src/stores/Env';
import AliasStore from '../../../packages/oors-config/src/stores/Alias';

const config = new Config();

config.addStore(
  new MemoryStore({
    rootDir: __dirname,
    rootURL: 'http://localhost:3000',
    isDev: process.env.NODE_ENV === 'development',
    port: 3000,
    sentry: {
      dsn: '',
    },
    secrets: {
      jwt: randomstring.generate(),
    },
    session: {
      secret: '',
      name: 'sessionId',
      resave: false,
      saveUninitialized: false,
      expiresIn: '1d',
    },
    morgan: {
      format: 'dev',
    },
    maxUploadSize: '20mb',
    modules: {
      mongodb: {
        connections: [
          {
            name: 'default',
            url: 'mongodb://localhost:27017/oors',
          },
        ],
      },
      user: {
        jwtConfig: {
          expiresIn: '1d',
        },
        mockUserMiddlewarePivot: {
          before: 'isMethod',
        },
        passportMiddlewarePivot: 'cookieParser',
        mockUserConfig: {
          enabled: false,
          path: '/graphiql',
          params: {
            email: '',
          },
        },
        passportConfig: {
          enabled: false,
        },
      },
      mailer: {
        transport: {
          jsonTransport: true,
        },
        saveToDisk: true,
        emailsDir: '',
        templatesDir: '',
        middlewarePivot: {
          before: 'isMethod',
        },
      },
      fileStorage: {
        uploadDir: '',
      },
      gql: {
        graphiql: {
          enabled: true,
          params: {
            subscriptionsEndpoint: 'ws://localhost:3000/subscriptions',
          },
        },
      },
      router: {
        middlewarePivot: {
          after: 'isMethod',
        },
      },
      logger: {
        logsDir: '',
      },
    },
  }),
);

config.addStore(new ENVStore('OORS_SERVER_CONFIG'));

config.addStore(
  new AliasStore(config, {
    'modules.user.rootURL': 'rootURL',
    'modules.user.jwtSecret': 'secrets.jwt',
    'modules.user.mockUser.config.enabled': 'isDev',
    'modules.user.jwtConfig.expiresIn': 'session.expiresIn',
    'modules.logger.logsDir': async c => path.resolve(await c.get('rootDir'), './logs'),
    'modules.mailer.emailsDir': async c => path.resolve(await c.get('rootDir'), './emails'),
    'modules.fileStorage.uploadDir': async c => path.resolve(await c.get('rootDir'), './uploads'),
  }),
);

export default config;
