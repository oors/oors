import { Repository } from 'oors-mongodb';

class UserLogin extends Repository {
  static schema = {
    type: 'object',
    properties: {
      userId: {
        isObjectId: true,
      },
      ip: {
        type: 'string',
      },
      browser: {
        type: 'string',
      },
      os: {
        type: 'string',
      },
      platform: {
        type: 'string',
      },
    },
    required: ['userId', 'ip', 'browser', 'os', 'platform'],
  };

  static collectionName = 'userUserLogin';

  static relations = {
    user: {
      repositoryName: 'oors.user.User',
      localField: 'userId',
      foreignField: '_id',
      type: 'one',
    },
  };
}

export default UserLogin;
