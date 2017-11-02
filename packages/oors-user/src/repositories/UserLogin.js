import { Repository } from 'oors-mongodb';

class UserLoginRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      userId: {
        isId: true,
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
}

export default UserLoginRepository;
