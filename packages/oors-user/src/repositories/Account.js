import { validators as v } from 'easevalidation';
import { Repository } from 'oors-mongodb';

class Account extends Repository {
  static schema = {
    name: v.isAny(v.isUndefined(), v.isString()),
    isActive: [v.isDefault(true), v.isBoolean()],
    isConfirmed: [v.isDefault(false), v.isBoolean()],
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

  async confirm(id) {
    if (!id) {
      throw new Error('Missing account id!');
    }

    const account = await this.findById(id);

    if (!account) {
      throw new Error('Account not found!');
    }

    if (account.isConfirmed) {
      throw new Error('Account is already confirmed!');
    }

    return this.updateOne({
      query: {
        _id: account._id,
      },
      update: {
        $set: {
          isConfirmed: true,
        },
      },
    });
  }
}

export default Account;
