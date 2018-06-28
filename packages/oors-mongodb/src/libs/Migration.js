/* eslint-disable class-methods-use-this */

class Migration {
  constructor(app, db) {
    this.app = app;
    this.db = db || this.app.modules.get('oors.mongoDb').getConnectionDb();
  }

  createCollection(...args) {
    return this.db.createCollection(...args);
  }

  renameCollection(oldName, newName) {
    return this.db.renameCollection(oldName, newName);
  }

  dropCollection(name) {
    return this.db.dropCollection(name);
  }

  getRepository(name) {
    return this.app.modules.get('oors.mongoDb').getRepository(name);
  }

  getCollectionName(repository) {
    return this.getRepository(repository).collectionName;
  }

  getCollection(repository) {
    return this.getRepository(repository).collection;
  }

  up() {
    throw new Error('Not implemented!');
  }

  down() {}
}

export default Migration;
