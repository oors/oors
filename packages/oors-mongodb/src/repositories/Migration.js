import { validators as v } from 'easevalidation';
import Repository from '../libs/Repository';

class MigrationRepository extends Repository {
  static schema = {
    timestamp: [v.isRequired(), v.isString()],
    name: v.isAny(v.isUndefined(), v.isString()),
    duration: v.isAny(v.isUndefined(), v.isInteger()),
  };

  static collectionName = 'Migration';
}

export default MigrationRepository;
