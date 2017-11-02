import errorHandlerFactory from 'errorhandler';

const errorHandler = errorHandlerFactory();

export default {
  id: 'errorHandler',
  factory: ({ isDev }) => (err, req, res, next) => {
    if (isDev) {
      return errorHandler(err, req, res, next);
    }

    req.app.modules.get('oors.logger').logger.error(err);
    res.status(500);

    return res.json({
      message: 'Internal server error!',
    });
  },
};
