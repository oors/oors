export default (comment, args, { loaders }) => loaders.oorsBlogPosts.findById.load(comment.postId);
