export default async (_, { username, password }, { modules, req, fromMongo }) => {
  const { token, user } = await modules.get('oors.user').login({ username, password });

  await modules.get('oors.user').saveLogin({ req, user });

  return {
    token,
    user: fromMongo(user),
  };
};
