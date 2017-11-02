import ValidationError from 'oors/build/errors/ValidationError';

export default schemas => (req, res, next) => {
  Object.keys(schemas).forEach(propr => {
    const schema = schemas[propr];
    const validate = req.ajv.compile(schema);

    if (!validate(req[propr])) {
      return next(new ValidationError(validate.errors));
    }

    return next();
  });
};
