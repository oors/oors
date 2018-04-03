import { Module } from 'oors';
import statusMonitor from 'express-status-monitor';
import pivotSchema from 'oors/build/schemas/pivot';
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
  router = router;

  initialize({ statusMonitorMiddlewarePivot }) {
    this.app.middlewares.insertBefore(statusMonitorMiddlewarePivot, {
      id: 'statusMonitor',
      factory: statusMonitor,
    });
  }
}

export default Health;
