import Boom from 'boom';

export default {
  id: 'requiresRole',
  factory: role => (req, res, next) => {
    if (!req.user.roles.includes(role)) {
      return next(Boom.unauthorized(`Missing "${role}" role!`));
    }

    return next();
  },
};
