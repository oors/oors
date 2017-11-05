import Repository from '../../../../../../packages/oors-mongodb/src/Repository';

class CategoryRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      createdBy: {
        isId: true,
      },
      updatedBy: {
        isId: true,
      },
    },
    required: ['name', 'createdBy'],
  };

  static collectionName = 'BlogCategory';
}

export default CategoryRepository;
