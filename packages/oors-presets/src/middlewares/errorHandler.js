import omit from 'lodash/omit';

export default {
  id: 'errorHandler',
  // eslint-disable-next-line no-unused-vars
  factory: ({ isDev }) => (err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    const error = isDev ? err : omit(err, 'stack');

    if (!isDev) {
      req.app.modules.get('oors.logger').logger.error(err);
    }

    return res.status(status).json({
      error,
    });
  },
};
