export default {
  id: 'boomErrorHandler',
  factory: ({ isDev }) => (err, req, res, next) => {
    if (!err.isBoom || (err.output.statusCode >= 500 && !isDev)) {
      return next(err);
    }

    return res.status(err.output.statusCode).json(err.output.payload);
  },
};
