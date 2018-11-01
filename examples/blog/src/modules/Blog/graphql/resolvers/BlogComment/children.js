export default (comment, args, { loaders }) => loaders.oorsBlogComments.findMany.load({
  query: {
    parentId: comment.id,
  },
});
