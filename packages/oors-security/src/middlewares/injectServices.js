import inject from 'oors/build/middlewares/inject';

export default inject('oors.security')([
  'GroupRepository',
  'UserRepository',
  'Security',
]);
