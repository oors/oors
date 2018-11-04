import Boom from 'boom';
import { ObjectID as objectId } from 'mongodb';
import { Router } from 'express';
import { helpers } from 'oors-router';
import injectServices from '../middlewares/injectServices';

const { wrapHandler } = helpers;

export default ({ uploadMiddleware }) => {
  const router = Router();

  router.use(injectServices);

  router.param('id', async (req, res, next, rawId) => {
    let id;

    try {
      id = objectId(rawId);
    } catch (err) {
      return next(err);
    }

    try {
      const file = await req.services['repositories.File'].findById(id);

      if (!file) {
        return next(Boom.notFound(`Unable to find entity with id ${rawId}`));
      }

      req.fileEntity = file;
    } catch (err) {
      return next(err);
    }

    return next();
  });

  router.post(
    '/files/upload',
    uploadMiddleware.single('file'),
    wrapHandler(req => req.services.File.createFromUpload(req.file)),
  );

  router.get('/files/:id/download', async (req, res, next) => {
    try {
      const filePath = await req.services.File.getPath({
        file: req.fileEntity,
      });
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
