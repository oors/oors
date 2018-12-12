export default async (_, { username, password }, { modules, req, fromMongo, getRepository }) => {
  const { User } = modules.get('oors.user');
  const LoginRepository = getRepository('oors.user.Login');

  const { token, user } = await User.login({ username, password });

  await LoginRepository.createOne({
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
