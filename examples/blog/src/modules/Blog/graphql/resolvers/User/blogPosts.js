export default (user, args, { loaders }) => loaders.blogPosts.findMany.load({
  query: {
    createdBy: user._id,
  },
});
