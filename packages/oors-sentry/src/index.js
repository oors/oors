/* eslint-disable class-methods-use-this */
import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import * as Sentry from '@sentry/node';

class SentryModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      dsn: [v.isRequired(), v.isString()],
      integrations: [v.isDefault([]), v.isArray()],
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
        factory: () => Sentry.Handlers.requestHandler(),
      });

      middlewares.insert(this.getConfig('middlewarePivots').error, {
        id: 'sentryErrorHandler',
        factory: () => Sentry.Handlers.errorHandler(),
      });
    },
  };

  async setup({ dsn, integrations, logGqlErrors }) {
    Sentry.init({
      dsn,
      integrations,
    });

    if (logGqlErrors) {
      this.onModule('oors.graphql', 'error', error => {
        this.logError(error);
      });
    }

    this.exportProperties(['logError']);
  }

  logError = error => new Promise(resolve => Sentry.captureException(error, resolve));
}

export default SentryModule;
