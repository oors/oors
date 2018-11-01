export default (post, args, { loaders }) => (post.relatedPostIds || []).length
  ? loaders.oorsBlogPosts.findMany.load({
    query: {
      _id: {
        $in: post.relatedPostIds,
      },
    },
  })
  : [];
