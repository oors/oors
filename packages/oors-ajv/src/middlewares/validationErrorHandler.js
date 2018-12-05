export default {
  id: 'ajvValidationErrorHandler',
  factory: () => (err, req, res, next) => {
    if (!err.code || err.code !== 'VALIDATION_ERROR') {
      return next(err);
    }

    return res.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: err.message,
      errors: err.errors,
    });
  },
};
