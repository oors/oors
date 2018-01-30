import path from 'path';
import dotenv from 'dotenv';
import Config from '../libs/Config';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config();

const config = new Config({ envPrefix: 'OORS_SERVER_CONFIG' });

config.add({
  rootDir: '',
  rootURL: config.ref(() => `http://${config.get('hostname')}:${config.get('port')}`),
  isDev: process.env.NODE_ENV === 'development',
  port: 3000,
  hostname: 'localhost',
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
        before: 'graphql',
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
    'oors.graphQL': {
      graphiql: {
        params: {
          subscriptionsEndpoint: config.ref(
            () => `ws://${config.get('hostname')}:${config.get('port')}/subscriptions`,
          ),
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
