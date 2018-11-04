export default (user, args, { loaders }) => loaders.oorsUserAccounts.findById.load(user.accountId);
