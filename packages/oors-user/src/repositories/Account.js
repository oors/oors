import { Repository } from 'oors-mongodb';

class AccountRepository extends Repository {
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
}

export default AccountRepository;
