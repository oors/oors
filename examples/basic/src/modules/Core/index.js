import { Module } from '../../../../../packages/oors/src/index';
import { wrapHandler } from '../../../../../packages/oors-router/src/libs/helpers';
import ProductRepositoryClass from './repositories/Product';

class CoreModule extends Module {
  name = 'core';

  async setup() {
    const [{ bindRepository }, { router }] = await this.dependencies([
      'oors.mongoDb',
      'oors.router',
    ]);

    const ProductRepository = bindRepository(new ProductRepositoryClass());

    router.get('/products', wrapHandler(() => ProductRepository.findMany().then(c => c.toArray())));

    this.export({
      ProductRepository,
    });
  }
}

export default CoreModule;
