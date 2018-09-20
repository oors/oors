export default {
  id: 'mockUser',
  factory: query => async (req, res, next) => {
    try {
      if (!req.user) {
        req.user = await req.app.modules.get('oors.user').UserRepository.findOne({
          query,
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  },
  params: {},
};
