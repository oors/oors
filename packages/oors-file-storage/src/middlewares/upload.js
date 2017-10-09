import multer from 'multer';
import { helpers } from 'oors';

const { createMiddleware } = helpers;

export default createMiddleware({
  id: 'upload',
  factory: multer,
});
