import { Router } from 'express';
import ms from 'ms';
import { helpers } from 'oors-router';

const { wrapHandler } = helpers;
const router = Router();

router.get(
  '/health',
  wrapHandler(async req => {
    const { startTime, checkModules } = req.app.modules.get('oors.health');
    const upTime = Date.now() - startTime;
    const modules = await checkModules();

    return {
      startTime,
      upTime,
      memoryUsage: process.memoryUsage(),
      readable: {
        startTime: new Date(startTime).toString(),
        upTime: ms(upTime, {
          long: true,
        }),
      },
      modules,
    };
  }),
);

export default router;
