import { Router } from 'express';
import authRouter from './auth';
import accountRouter from './account';

export default ({ jwtMiddleware }) => {
  const router = Router();

  router.use('/user', authRouter({ jwtMiddleware }));
  router.use('/account', accountRouter);

  return router;
};
