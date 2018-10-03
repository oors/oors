export default (comment, args, { loaders }) => loaders.blogPosts.findById.load(comment.postId);
