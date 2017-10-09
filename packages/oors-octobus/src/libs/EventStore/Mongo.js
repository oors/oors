class MongoStore {
  constructor(db, collectionName = 'OctobusMessage') {
    this.db = db;
    this.collectionName = collectionName;
  }

  setMessageBus(messageBus) {
    messageBus.onMessage(msg => this.save(msg));
  }

  save(msg) {
    this.db.collection(this.collectionName).insertOne({
      ...msg,
      data: JSON.stringify(msg.data, null, 2),
    });
  }

  find(query) {
    return this.db.collection(this.collectionName).find(query).toArray();
  }

  findChildren(messageId, filters = {}) {
    return this.db
      .collection(this.collectionName)
      .find({ ...filters, parentId: messageId })
      .toArray();
  }
}

export default MongoStore;
