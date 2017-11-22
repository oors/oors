export default {
  Query: {
    modules: (_, args, { app }) => app.modules.getModuleNames().map(({ name }) => ({ name })),
    module: (_, { name }, { app }) => {
      if (!app.modules.getModuleNames().includes(name)) {
        throw new Error('Not found!');
      }

      return [{ name }];
    },
  },
  Module: {
    dependencies: ({ name }, args, { app }) =>
      app.modules.dependencyGraph[name].map(module => ({ name: module })),
  },
};
