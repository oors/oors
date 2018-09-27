export default {
  id: 'nextRender',
  factory: () => (req, res, next) => {
    if (!req.nextApp) {
      return next();
    }

    return res.handle(req, res);
  },
};
