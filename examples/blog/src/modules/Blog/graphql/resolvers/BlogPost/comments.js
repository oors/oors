export default (post, { offset = 0, limit = 10 }, { loaders }) => loaders.oorsBlogComments.findMany.load({
  query: {
    postId: post._id,
  },
  skip: parseInt(offset, 10) || 0,
  limit: Math.max(parseInt(limit, 10) || 10, 20),
  orderBy: {
    createdAt: 'desc',
  },
});
