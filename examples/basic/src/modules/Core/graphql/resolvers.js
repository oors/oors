export default {
  Query: {
    products: async (_, args, { app, fromMongoCursor }) =>
      fromMongoCursor(await app.modules.get('core').ProductRepository.findMany()),
  },
  Product: {
    price: product => product.price || 0,
  },
};
