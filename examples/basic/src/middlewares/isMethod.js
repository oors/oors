export default {
  id: 'isMethod',
  factory: () => (req, res, next) => {
    if (!req.isMethod) {
      req.isMethod = method => req.method.toLowerCase() === method.toLowerCase();
    }

    next();
  },
};
