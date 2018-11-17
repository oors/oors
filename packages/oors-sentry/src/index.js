/* eslint-disable class-methods-use-this */
import { Module } from 'oors';
import Raven from 'raven';
import pivotSchema from 'oors-express/build/schemas/pivot';

class SentryModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      dsn: {
        type: 'string',
      },
      options: {
        type: 'object',
        default: {},
      },
      middlewarePivots: {
        type: 'object',
        properties: {
          request: pivotSchema,
          error: pivotSchema,
        },
        default: {},
        required: ['request', 'error'],
      },
      logGqlErrors: {
        type: 'boolean',
        default: true,
      },
    },
    required: ['dsn'],
  };

  name = 'oors.sentry';

  hooks = {
    'oors.express.middlewares': ({ middlewares }) => {
      middlewares.insert(this.getConfig('middlewarePivots').request, {
        id: 'sentryRequestHandler',
        factory: () => Raven.requestHandler(),
      });

      middlewares.insert(this.getConfig('middlewarePivots').error, {
        id: 'sentryErrorHandler',
        factory: () => Raven.errorHandler(),
      });
    },
  };

  async setup({ dsn, options, logGqlErrors }) {
    await new Promise((resolve, reject) => {
      Raven.config(dsn, {
        parseUser: req => req.user._id,
        captureUnhandledRejections: true,
        ...options,
      }).install(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (logGqlErrors) {
      this.onModule('oors.graphql', 'error', error => {
        this.logError(error);
      });
    }

    this.exportProperties(['logError']);
  }

  logError = error => new Promise(resolve => Raven.captureException(error, resolve));
}

export default SentryModule;
