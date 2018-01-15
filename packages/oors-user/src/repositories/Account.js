import { Repository } from 'oors-mongodb';
import schema from '../schemas/account';

class AccountRepository extends Repository {
  static schema = schema;
  static collectionName = 'userAccount';
}

export default AccountRepository;
