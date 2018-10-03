export default (post, args, { loaders }) => loaders.users.findById.load(post.createdBy);
