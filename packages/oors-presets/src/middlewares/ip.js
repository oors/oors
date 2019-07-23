export default {
  id: 'ip',
  factory: ({ key }) => (req, res, next) => {
    req[key] = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip).replace(
      '::ffff:',
      '',
    );

    next();
  },
  params: {
    key: 'ip',
  },
};
