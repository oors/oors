import { Module } from 'oors';
import statusMonitor from 'express-status-monitor';
import pivotSchema from 'oors-express/build/schemas/pivot';
import router from './router';

class Health extends Module {
  static schema = {
    type: 'object',
    properties: {
      statusMonitorMiddlewarePivot: {
        ...pivotSchema,
        default: 'isMethod',
      },
    },
  };

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
