import { Repository } from 'oors-mongodb';

class Account extends Repository {
  static schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      isActive: {
        type: 'boolean',
        default: true,
      },
      isDeleted: {
        type: 'boolean',
      },
      isConfirmed: {
        type: 'boolean',
        default: false,
      },
      deletedAt: {
        instanceof: 'Date',
      },
    },
  };

  static collectionName = 'userAccount';

  static relations = {
    users: {
      repositoryName: 'oors.user.User',
      localField: '_id',
      foreignField: 'accountId',
      type: 'many',
    },
  };
}

export default Account;
