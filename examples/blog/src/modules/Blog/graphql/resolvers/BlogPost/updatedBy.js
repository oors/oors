export default (post, args, { loaders }) => post.updatedBy ? loaders.oorsUserUsers.findById.load(post.updatedBy) : null;
