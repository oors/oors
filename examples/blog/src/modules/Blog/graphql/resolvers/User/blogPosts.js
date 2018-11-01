export default (user, args, { loaders }) => loaders.oorsBlogPosts.findMany.load({
  query: {
    createdBy: user._id,
  },
});
