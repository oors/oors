import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    startTime: req.app.get('startTime'),
    upTime: Date.now() - req.app.get('startTime'),
    memoryUsage: process.memoryUsage(),
  });
});

export default router;
