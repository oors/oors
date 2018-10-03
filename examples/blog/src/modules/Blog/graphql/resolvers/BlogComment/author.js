export default (comment, args, { loaders }) => loaders.users.findById.load(comment.createdBy);
