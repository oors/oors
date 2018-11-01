export default (post, args, { loaders }) => loaders.oorsBlogCategories.findById.load(post.categoryId);
