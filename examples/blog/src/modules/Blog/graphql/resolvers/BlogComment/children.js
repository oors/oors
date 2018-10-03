export default (comment, args, { loaders }) => loaders.blogComments.findMany.load({
  query: {
    parentId: comment.id,
  },
});
