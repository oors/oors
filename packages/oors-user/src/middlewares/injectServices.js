import inject from 'oors-express/build/middlewares/inject';

export default inject('oors.user')([
  'User',
  'repositories.Account',
  'repositories.User',
  'repositories.Login',
]);
