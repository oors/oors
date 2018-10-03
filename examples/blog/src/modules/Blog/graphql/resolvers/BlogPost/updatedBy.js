export default (post, args, { loaders }) => post.updatedBy ? loaders.users.findById.load(post.updatedBy) : null;
