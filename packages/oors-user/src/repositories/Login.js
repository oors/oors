import { validators as v } from 'easevalidation';
import { Repository } from 'oors-mongodb';
import isObjectId from 'oors-mongodb/build/libs/isObjectId';

class Login extends Repository {
  static schema = {
    userId: [v.isRequired(), isObjectId()],
    ip: [v.isRequired(), v.isString()],
    browser: [v.isRequired(), v.isString()],
    os: [v.isRequired(), v.isString()],
    platform: [v.isRequired(), v.isString()],
  };

  static relations = {
    user: {
      repositoryName: 'oors.user.User',
      localField: 'userId',
      foreignField: '_id',
      type: 'one',
    },
  };
}

export default Login;
