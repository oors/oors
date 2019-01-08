import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import FailedLogin from '../errors/FailedLogin';

export default ({ jwtSecret, User, canLogin, login }) => {
  passport.use(
    new JwtStrategy(
      {
        secretOrKey: jwtSecret,
        jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderWithScheme('Bearer')]),
        passReqToCallback: true,
      },
      async (req, id, done) => {
        try {
          const user = await User.findById(id);
          await canLogin(user);
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );

  passport.use(
    new LocalStrategy(
      {
        passReqToCallback: true,
      },
      async (req, username, password, done) => {
        try {
          const { user } = await login({ username, password });
          return done(null, user);
        } catch (error) {
          if (error instanceof FailedLogin) {
            return done(null, false, error);
          }

          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, cb) => {
    cb(null, user._id.toString());
  });

  passport.deserializeUser((req, id, cb) => {
    User.findById(id).then(user => cb(null, user), cb);
  });

  return passport;
};
