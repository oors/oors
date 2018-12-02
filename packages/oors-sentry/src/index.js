/* eslint-disable class-methods-use-this */
import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import Raven from 'raven';

class SentryModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      dsn: [v.isRequired(), v.isString()],
      options: [v.isDefault({}), v.isObject()],
      middlewarePivots: [
        v.isDefault({}),
        v.isSchema({
          request: [
            v.isRequired(),
            v.isAny(
              v.isString(),
              v.isSchema({
                before: v.isAny(v.isString(), v.isUndefined()),
                after: v.isAny(v.isString(), v.isUndefined()),
              }),
            ),
          ],
          error: [
            v.isRequired(),
            v.isAny(
              v.isString(),
              v.isSchema({
                before: v.isAny(v.isString(), v.isUndefined()),
                after: v.isAny(v.isString(), v.isUndefined()),
              }),
            ),
          ],
        }),
      ],
      logGqlErrors: [v.isDefault(true), v.isBoolean()],
    }),
  );

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
