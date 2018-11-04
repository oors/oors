import inject from 'oors/build/middlewares/inject';

export default inject('oors.user')([
  'Account',
  'repositories.Account',
  'User',
  'repositories.User',
  'repositories.UserLogin',
]);
