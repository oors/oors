export default (account, args, { loaders }) =>
  loaders.oorsUserUsers.findMany.load({
    query: {
      accountId: account._id,
    },
  });
