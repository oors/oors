export default (comment, args, { loaders }) => comment.parentId ? loaders.oorsBlogComments.findById.load(comment.parentId) : null;
