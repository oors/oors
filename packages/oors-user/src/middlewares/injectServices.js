import inject from 'oors/build/middlewares/inject';

export default inject('oors.user')([
  'Account',
  'AccountRepository',
  'User',
  'UserRepository',
  'UserLoginRepository',
]);
