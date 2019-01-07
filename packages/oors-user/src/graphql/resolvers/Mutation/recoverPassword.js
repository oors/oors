export default async (_, { token, password }, { modules, fromMongo }) =>
  fromMongo(
    await modules.get('oors.user').recoverPassword({
      token,
      password,
    }),
  );
