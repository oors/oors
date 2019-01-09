export default async (_, { usernameOrEmail }, { modules }) => {
  await modules.get('oors.user').resetPassword(usernameOrEmail);
};
