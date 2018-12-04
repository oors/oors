export default (post, args, { loaders }) => loaders.oorsUserUsers.findById.load(post.createdBy);
