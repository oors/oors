import createApp from 'next';
import nextRoutes from 'next-routes';

export default {
  id: 'nextInstall',
  factory: async ({ appConfig, routes }) => {
    let handler;
    const app = createApp(appConfig);
    const handle = app.getRequestHandler();

    if (routes) {
      const router = nextRoutes();
      Object.keys(routes).forEach(name => {
        router.add(name, routes[name].pattern, routes[name].page);
      });
      handler = router.getRequestHandler(app);
    }

    await app.prepare();

    if (handler) {
      return handler;
    }

    return (req, res, next) => {
      req.nextApp = app;
      res.handle = handle;
      req.handler = handler;
      res.renderPage = (path, query = {}) =>
        app.render(req, res, path, {
          ...req.query,
          ...query,
        });
      return next();
    };
  },
};
