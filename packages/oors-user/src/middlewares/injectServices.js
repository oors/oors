import inject from 'oors-express/build/middlewares/inject';

export default inject('oors.user')([
  'Account',
  'repositories.Account',
  'User',
  'repositories.User',
  'repositories.UserLogin',
]);
