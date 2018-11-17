import { Router } from 'express';
import ms from 'ms';

const router = Router();

router.get('/health', (req, res) => {
  // @TODO: fixme
  const { startTime } = req.app.modules.get('oors.health');
  const upTime = Date.now() - startTime;

  res.json({
    startTime,
    upTime,
    memoryUsage: process.memoryUsage(),
    readable: {
      startTime: ms(startTime, { long: true }),
      upTime: ms(upTime, {
        long: true,
      }),
    },
  });
});

export default router;
