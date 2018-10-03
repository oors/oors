export default (category, args, { loaders }) => loaders.blogPosts.findMany.load({
  query: {
    categoryId: category._id,
  },
});
