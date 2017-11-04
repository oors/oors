import Repository from '../../../../../../packages/oors-mongodb/src/Repository';

class ProductRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      price: {
        type: 'number',
      },
    },
    required: ['name'],
  };

  findAllExpensive() {
    return this.findMany({
      query: {
        price: {
          $gt: 1000,
        },
      },
    });
  }
}

export default ProductRepository;
