import Boom from 'boom';

export default {
  id: 'requiresAuth',
  factory: () => (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return next(Boom.unauthorized('Requires authentication!'));
    }

    return next();
  },
};
