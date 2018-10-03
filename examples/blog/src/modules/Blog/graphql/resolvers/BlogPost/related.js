export default (post, args, { loaders }) => (post.relatedPostIds || []).length
  ? loaders.blogPosts.findMany.load({
    query: {
      _id: {
        $in: post.relatedPostIds,
      },
    },
  })
  : [];
