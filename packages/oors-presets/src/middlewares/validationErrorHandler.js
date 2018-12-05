export default {
  id: 'validationErrorHandler',
  factory: () => (err, req, res, next) => {
    if (err.name !== 'ValidationError' || !err.code) {
      return next(err);
    }

    return res.status(400).json(err);
  },
};
