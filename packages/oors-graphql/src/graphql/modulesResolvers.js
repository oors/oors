export default {
  Query: {
    modules: (_, { name }, { app }) => {
      const { dependencyGraph } = app.modules;
      if (name) {
        return [{ name }];
      }

      return Object.keys(dependencyGraph).map(module => ({ name: module }));
    },
  },
  Module: {
    dependencies: ({ name }, args, { app }) =>
      app.modules.dependencyGraph[name].map(module => ({ name: module })),
  },
};
