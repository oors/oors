export default {
  id: 'mockUser',
  factory: query => async (req, res, next) => {
    try {
      if (!req.user) {
        req.user = await req.app.modules
          .get('oors.user')
          .UserRepository.findOne({
            query,
          });
      }
    } catch (err) {
      return next(err);
    }

    return next();
  },
  params: {},
};
