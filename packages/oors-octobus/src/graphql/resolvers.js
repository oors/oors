export default {
  Query: {
    octobusMessages: (_, args, { app }) =>
      app.modules.get('oors.octobus').messageStore.find(args),
  },
  OctobusMessage: {
    children: (message, args, { app }) =>
      app.modules
        .get('oors.octobus')
        .messageStore.findChildren(message.id, args),
    data: message => JSON.stringify(message.data),
  },
};
