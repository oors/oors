import { Repository } from 'oors-mongodb';
import schema from '../schemas/userLogin';

class UserLoginRepository extends Repository {
  static schema = schema;

  static collectionName = 'userUserLogin';
}

export default UserLoginRepository;
