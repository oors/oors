import { validate, validators as v } from 'easevalidation';

export default schema => (req, res, next) => {
  try {
    validate(v.isSchema(schema))(req);
    next();
  } catch (error) {
    next(error);
  }
};
