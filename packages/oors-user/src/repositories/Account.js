import { validators as v } from 'easevalidation';
import { Repository } from 'oors-mongodb';

class Account extends Repository {
  static schema = {
    name: v.isAny(v.isUndefined(), v.isString()),
    isActive: [v.isDefault(true), v.isBoolean()],
    isConfirmed: [v.isDefault(false), v.isBoolean()],
    isDeleted: v.isAny(v.isUndefined(), v.isBoolean()),
    deletedAt: v.isAny(v.isUndefined(), v.isDate()),
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
