import { Repository } from 'oors-mongodb';
import schema from '../schemas/userLogin';

class UserLogin extends Repository {
  static schema = schema;

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
