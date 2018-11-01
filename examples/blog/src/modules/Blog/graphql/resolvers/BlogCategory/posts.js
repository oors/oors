export default (category, args, { loaders }) => loaders.oorsBlogPosts.findMany.load({
  query: {
    categoryId: category._id,
  },
});
