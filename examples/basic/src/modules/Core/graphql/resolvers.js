export default {
  Query: {
    products: (_, args, { app, fromMongo }) =>
      app.modules
        .get('core')
        .ProductRepository.findMany()
        .then(c => c.map(fromMongo).toArray()),
  },
  Product: {
    price: product => product.price || 0,
  },
};
