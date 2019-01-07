export default (account, args, { loaders }) =>
  loaders.oorsUserUsers.findOne.load({
    query: {
      accountId: account._id,
      isOwner: true,
    },
  });
