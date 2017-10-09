import passport from 'passport';

export default {
  id: 'passportSession',
  factory: () => passport.session(),
};
