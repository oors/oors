export default {
  id: 'lastRequest',
  factory: ({ shouldStamp }) => (req, res, next) => {
    if (req.session && shouldStamp(req)) {
      req.session.lastRequest = Date.now();
    }
    next();
  },
  params: { shouldStamp: () => true },
};
