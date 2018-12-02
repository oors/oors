import ValidationError from 'oors-ajv/build/ValidationError';

export default schemas => {
  let validate;

  return (req, res, next) => {
    Object.keys(schemas).forEach(propr => {
      const schema = schemas[propr];

      if (!validate) {
        validate = req.ajv.compile(schema);
      }

      if (!validate(req[propr])) {
        return next(new ValidationError(validate.errors));
      }

      return next();
    });
  };
};
