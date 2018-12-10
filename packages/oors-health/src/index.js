import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import statusMonitor from 'express-status-monitor';
import { isMiddlewarePivot } from 'oors-express/build/validators';
import router from './router';

class Health extends Module {
  static validateConfig = validate(
    v.isSchema({
      statusMonitorMiddlewarePivot: [v.isDefault('isMethod'), isMiddlewarePivot()],
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
