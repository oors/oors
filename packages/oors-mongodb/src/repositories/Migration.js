import Repository from '../libs/Repository';

class MigrationRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      timestamp: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      duration: {
        type: 'integer',
      },
    },
    required: ['timestamp'],
  };

  static collectionName = 'Migration';
}

export default MigrationRepository;
