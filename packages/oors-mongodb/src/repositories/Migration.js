import Repository from '../Repository';
import schema from '../schemas/migration';

class MigrationRepository extends Repository {
  static schema = schema;

  static collectionName = 'Migration';
}

export default MigrationRepository;