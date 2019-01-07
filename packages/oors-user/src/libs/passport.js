import { ObjectID as objectId } from 'mongodb';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import FailedLogin from '../errors/FailedLogin';

export default ({ jwtSecret }) => {
  passport.use(
    new JwtStrategy(
      {
        secretOrKey: jwtSecret,
        jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderWithScheme('Bearer')]),
        passReqToCallback: true,
      },
      async (req, id, done) => {
        const { UserRepository, AccountRepository, User } = req.app.modules.get('oors.user');

        try {
          const user = await UserRepository.findById(objectId(id));
          const account = await AccountRepository.findById(user.accountId);

          await User.canLogin({
            user,
            account,
          });

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
        const { User } = req.app.modules.get('oors.user');

        try {
          const user = await User.login({ username, password });
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
    req.app.modules
      .get('oors.user.repositories.User')
      .findById(objectId(id))
      .then(user => cb(null, user), cb);
  });

  return passport;
};
