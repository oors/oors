import path from 'path';
import dotenv from 'dotenv';
import Config from '../libs/Config';
import * as middlewares from '../middlewares';

dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const config = new Config({ envPrefix: 'OORS_SERVER_CONFIG' });

config.add({
  rootDir: '',
  rootURL: config.ref(() => `http://${config.get('hostname')}:${config.get('port')}`),
  isDev: process.env.NODE_ENV === 'development',
  port: 3000,
  hostname: 'localhost',
  cookieSecret: 'THIS_IS_MY_SECRET',
  modules: {
    'oors.express': {
      middlewares: config.ref(() => [
        middlewares.ip,
        middlewares.cors,
        middlewares.useragent,
        middlewares.hpp,
        middlewares.helmet,
        {
          ...middlewares.morgan,
          params: 'dev',
          enabled: config.get('isDev'),
        },
        {
          ...middlewares.compression,
          enabled: !config.get('isDev'),
        },
        {
          ...middlewares.latency,
          enabled: false,
        },
        {
          ...middlewares.bodyParserJSON,
          params: { limit: '20mb' },
        },
        middlewares.bodyParserURLEncoded,
        {
          ...middlewares.cookieParser,
          params: {
            secret: config.get('cookieSecret'),
          },
        },
        {
          ...middlewares.session,
          params: {
            secret: config.get('cookieSecret'),
            resave: false,
            saveUninitialized: false,
            ttl: 14 * 24 * 60 * 60,
            cookie: {
              secure: !config.get('isDev'),
              maxAge: 14 * 24 * 60 * 60 * 1000,
            },
          },
        },
        middlewares.lastRequest,
        middlewares.isMethod,
        middlewares.validationErrorHandler,
        {
          ...middlewares.boomErrorHandler,
          params: {
            isDev: config.get('isDev'),
          },
        },
        {
          ...middlewares.errorHandler,
          params: {
            isDev: config.get('isDev'),
          },
        },
      ]),
    },
    'oors.rad': {
      autoload: {
        services: true,
        methods: true,
      },
    },
    'oors.mongodb': {
      connections: [
        {
          name: 'default',
          url: 'mongodb://localhost:27017/oors',
        },
      ],
      logQueries: config.ref('isDev'),
      addTimestamps: true,
      autoloadRepositories: false,
    },
    'oors.user': {
      jwtSecret: 'MY_JWT_SECRET',
      jwtConfig: {
        expiresIn: '1d',
      },
      mockUserMiddlewarePivot: {
        before: 'apolloServer',
      },
      passportMiddlewarePivot: {
        after: 'cookieParser',
      },
      jwtMiddlewarePivot: {
        before: 'apolloServer',
      },
      mockUserConfig: {
        enabled: false,
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
      isDev: config.ref('isDev'),
    },
    'oors.upload': {
      uploadDir: config.ref(() => path.resolve(config.get('rootDir'), './uploads')),
    },
    'oors.graphql': {
      serverOptions: {
        debug: config.ref('isDev'),
        tracing: config.ref('isDev'),
        introspection: config.ref('isDev'),
        playground: config.ref('isDev'),
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
    'oors.cache': {
      defaultCache: {
        name: 'cache',
        options: {},
      },
    },
    'oors.rateLimiter': {
      middleware: {
        isEnabled: false,
        config: {
          max: 100,
        },
      },
    },
  },
});

export default config;
