import { test, validators as v } from 'easevalidation';
import { Module } from 'oors';
import statusMonitor from 'express-status-monitor';
import router from './router';

class Health extends Module {
  static validateConfig = test(
    v.isSchema({
      statusMonitorMiddlewarePivot: [
        v.isDefault('isMethod'),
        v.isAny(
          v.isString(),
          v.isSchema({
            before: v.isAny(v.isString(), v.isUndefined()),
            after: v.isAny(v.isString(), v.isUndefined()),
          }),
        ),
      ],
    }),
  );

  name = 'oors.health';

  hooks = {
    'oors.express.middlewares': ({ middlewares }) => {
      middlewares.insertBefore(this.getConfig('statusMonitorMiddlewarePivot'), {
        id: 'statusMonitor',
        factory: statusMonitor,
      });
    },
  };

  initialize() {
    this.export({
      startTime: Date.now(),
    });
  }

  router = router;
}

export default Health;
