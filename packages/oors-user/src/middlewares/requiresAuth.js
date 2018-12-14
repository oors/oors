import Boom from 'boom';

export default {
  id: 'requiresAuth',
  factory: () => (req, res, next) => {
    if (!req.user) {
      return next(Boom.unauthorized('Requires authentication!'));
    }

    return next();
  },
};
