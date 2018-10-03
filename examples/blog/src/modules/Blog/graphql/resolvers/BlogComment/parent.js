export default (comment, args, { loaders }) => comment.parentId ? loaders.blogComments.findById.load(comment.parentId) : null;
