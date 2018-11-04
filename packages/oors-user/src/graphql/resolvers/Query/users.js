export default async (_, args, { getRepository, fromMongoArray }) =>
  getRepository('oors.user.User')
    .findMany()
    .then(fromMongoArray);
