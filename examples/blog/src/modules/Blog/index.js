import { Module } from '../../../../../packages/oors';
import withSoftDelete from '../../../../../packages/oors-mongodb/build/decorators/withSoftDelete';

class BlogModule extends Module {
  name = 'oors.blog';

  async setup() {
    await this.dependencies(['oors.mongodb']);
    const { Post } = this.get('repositories');
    withSoftDelete()(Post);
  }
}

export default BlogModule;
