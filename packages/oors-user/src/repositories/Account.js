import { Repository } from 'oors-mongodb';
import schema from '../schemas/account';

class Account extends Repository {
  static schema = schema;

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
