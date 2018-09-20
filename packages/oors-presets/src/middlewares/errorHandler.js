export default {
  id: 'errorHandler',
  // eslint-disable-next-line no-unused-vars
  factory: ({ isDev }) => (error, req, res, next) => {
    const status = error.statusCode || error.status || 500;

    if (!isDev) {
      req.app.modules.get('oors.logger').logger.error(error);
    } else {
      console.log(error);
    }

    return res.status(status).json({
      error: error.message,
    });
  },
};
