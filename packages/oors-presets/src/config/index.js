import path from 'path';
import Config from '../libs/Config';

const config = new Config({ envPrefix: 'OORS_SERVER_CONFIG' });

config.add({
  rootDir: __dirname,
  rootURL: 'http://localhost:3000',
  isDev: process.env.NODE_ENV === 'development',
  port: 3000,
  middlewares: {
    useragent: {},
    cors: {},
    helmet: {},
    morgan: {
      params: 'dev',
      enabled: config.ref('isDev'),
    },
    compression: {
      enabled: config.ref(() => !config.get('isDev')),
    },
    bodyParserJSON: {
      params: { limit: '20mb' },
    },
    bodyParserURLEncoded: {},
    cookieParser: {
      params: {
        secret: 'THIS_IS_MY_SECRET',
      },
    },
    statusMonitor: {},
    isMethod: {},
    validationErrorHandler: {},
    boomErrorHandler: {
      params: {
        isDev: config.ref('isDev'),
      },
    },
    errorHandler: {
      params: {
        isDev: config.ref('isDev'),
      },
    },
  },
  modules: {
    'oors.mongoDb': {
      connections: [
        {
          name: 'default',
          url: 'mongodb://localhost:27017/oors',
        },
      ],
    },
    'oors.user': {
      rootURL: config.ref('rootURL'),
      jwtSecret: 'MY_JWT_SECRET',
      jwtConfig: {
        expiresIn: '1d',
      },
      mockUserMiddlewarePivot: {
        before: 'isMethod',
      },
      passportMiddlewarePivot: 'cookieParser',
      mockUserConfig: {
        enabled: config.ref('isDev'),
        path: '/graphql',
        params: {}, // no params means an empty query - just load any db user
      },
      passportConfig: {
        enabled: false,
      },
    },
    'oors.mailer': {
      transport: {
        jsonTransport: true,
      },
      saveToDisk: true,
      emailsDir: config.ref(() => path.resolve(config.get('rootDir'), './emails')),
      templatesDir: '',
      middlewarePivot: {
        before: 'isMethod',
      },
    },
    'oors.fileStorage': {
      uploadDir: config.ref(() => path.resolve(config.get('rootDir'), './uploads')),
    },
    'oors.gql': {
      graphiql: {
        enabled: true,
        params: {
          subscriptionsEndpoint: 'ws://localhost:3000/subscriptions',
        },
      },
    },
    'oors.router': {
      middlewarePivot: {
        after: 'isMethod',
      },
    },
    'oors.logger': {
      logsDir: config.ref(() => path.resolve(config.get('rootDir'), './logs')),
    },
  },
});

export default config;
