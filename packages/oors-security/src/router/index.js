import { Router } from 'express';

const router = Router();

router.get('/permissions', (req, res) =>
  res.json(req.app.modules.get('oors.security').permissions.getAll()),
);

export default router;
