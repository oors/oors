export default (comment, args, { loaders }) => loaders.oorsUserUsers.findById.load(comment.createdBy);
