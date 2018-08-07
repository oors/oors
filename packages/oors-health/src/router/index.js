import { Router } from 'express';
import ms from 'ms';

const router = Router();

router.get('/health', (req, res) => {
  const startTime = req.app.get('startTime');
  const upTime = Date.now() - req.app.get('startTime');

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
