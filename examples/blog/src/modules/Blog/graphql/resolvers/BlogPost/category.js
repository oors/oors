export default (post, args, { loaders }) => loaders.blogCategories.findById.load(post.categoryId);
