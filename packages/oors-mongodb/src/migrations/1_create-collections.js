import uniq from 'lodash/uniq';
import { Migration } from 'oors-mongodb';

export default class extends Migration {
  name = 'Create Collections';

  getCollectionNames() {
    return uniq(
      Object.keys(this.modules.get('oors.mongodb').repositories).map(repositoryName =>
        this.getCollectionName(repositoryName),
      ),
    );
  }

  async up() {
    await Promise.all(this.getCollectionNames().map(name => this.createCollection(name)));
  }

  async down() {
    return Promise.all(this.getCollectionNames().map(name => this.dropCollection(name)));
  }
}
