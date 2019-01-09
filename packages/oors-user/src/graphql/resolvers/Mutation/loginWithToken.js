export default async (_, { token }, { modules, fromMongo }) => {
  const { token: authToken, user } = await modules.get('oors.user').loginWithToken(token);

  return {
    token: authToken,
    user: fromMongo(user),
  };
};
