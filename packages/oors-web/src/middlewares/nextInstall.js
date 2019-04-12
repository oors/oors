import createApp from 'next';

export default {
  id: 'nextInstall',
  factory: async ({ appConfig }) => {
    const app = createApp(appConfig);
    const handle = app.getRequestHandler();

    await app.prepare();

    return (req, res, next) => {
      req.nextApp = app;
      res.handle = handle;
      res.renderPage = (path, query = {}) =>
        app.render(req, res, path, {
          ...req.query,
          ...query,
        });
      return next();
    };
  },
};
