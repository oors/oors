export default {
  Query: {
    modules: (_, args, { modules }) => modules.getModuleNames().map(name => ({ name })),
    module: (_, { name }, { modules }) => {
      if (!modules.getModuleNames().includes(name)) {
        throw new Error('Not found!');
      }

      return [{ name }];
    },
  },
  Module: {
    dependencies: ({ name }, args, { modules }) =>
      modules.dependencyGraph[name].map(module => ({ name: module })),
  },
};
