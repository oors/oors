import { Module } from '../../../../../packages/oors/src/index';
import { wrapHandler } from '../../../../../packages/oors-router/src/libs/helpers';

class CoreModule extends Module {
  name = 'core';

  async setup() {
    const [{ createRepository }, { router }] = await this.dependencies([
      'oors.mongoDb',
      'oors.router',
    ]);

    const ProductRepository = createRepository({
      collectionName: 'Product',
      schema: {
        type: 'object',
        properties: {
          // id: {
          //   isId: true,
          // },
          name: {
            type: 'string',
          },
          price: {
            type: 'number',
          },
        },
        required: ['name'],
      },
    });

    // const data = {
    //   id: '59f9e218d61ff389842dc87d',
    //   name: 'fsafsa',
    // };
    //
    // await ProductRepository.validate(data);
    //
    // // console.log(ProductRepository.validate.errors);
    // console.log(data.id.constructor.name);

    router.get('/products', wrapHandler(() => ProductRepository.findMany().then(c => c.toArray())));

    this.export({
      ProductRepository,
    });
  }
}

export default CoreModule;
