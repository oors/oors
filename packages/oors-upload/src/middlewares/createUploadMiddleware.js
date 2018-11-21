import multer from 'multer';
import { helpers } from 'oors-express';

const { createMiddleware } = helpers;

export default createMiddleware({
  id: 'upload',
  factory: multer,
});
