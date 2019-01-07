export default async (_, { token }, { fromMongo, getRepository }) =>
  fromMongo(await getRepository('oors.user.Account').confirm(token));
