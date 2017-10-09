import passport from 'passport';

export default {
  id: 'passportInitialize',
  factory: () => passport.initialize(),
};
