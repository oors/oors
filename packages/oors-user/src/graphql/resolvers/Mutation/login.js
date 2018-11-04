export default async (_, { username, password }, { app, req, fromMongo, getRepository }) => {
  const { User } = app.modules.get('oors.user');
  const UserLoginRepository = getRepository('oors.user.UserLogin');

  const { token, user } = await User.login({ username, password });

  await UserLoginRepository.createOne({
    userId: user._id,
    ip: req.ip,
    browser: req.useragent.browser,
    os: req.useragent.os,
    platform: req.useragent.platform,
  });

  return {
    token,
    user: fromMongo(User.dump(user)),
  };
};
