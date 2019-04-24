import { validators as v } from 'easevalidation';
import { Repository } from 'oors-mongodb';

class Account extends Repository {
  static schema = {
    isActive: [v.isDefault(true), v.isBoolean()],
    confirmation: [
      v.isDefault({}),
      v.isSchema({
        isCompleted: [v.isDefault(false), v.isBoolean()],
        token: v.isAny(v.isUndefined(), v.isString()),
        confirmedAt: v.isAny(v.isUndefined(), v.isDate()),
      }),
    ],
  };

  static relations = {
    users: {
      repositoryName: 'oors.user.User',
      localField: '_id',
      foreignField: 'accountId',
      type: 'many',
    },
  };

  async confirm(token) {
    const account = await this.findOne({
      query: {
        'confirmation.token': token,
      },
    });

    if (!account) {
      throw new Error('Account not found!');
    }

    if (account.confirmation.isCompleted) {
      throw new Error('Account is already confirmed!');
    }

    return this.updateOne({
      query: {
        _id: account._id,
      },
      update: {
        $set: {
          'confirmation.isCompleted': true,
          'confirmation.confirmedAt': new Date(),
        },
      },
    });
  }
}

export default Account;
