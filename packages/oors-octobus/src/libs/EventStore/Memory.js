import filter from 'lodash/filter';

class MemoryStore {
  constructor() {
    this.data = [];
  }

  setMessageBus(messageBus) {
    messageBus.onMessage(msg => this.save(msg));
  }

  save(msg) {
    this.data.push(msg);
  }

  find(query = {}) {
    return filter(this.data, query);
  }

  findChildren(parentId, query = {}) {
    return filter(this.data, {
      ...query,
      parentId,
    });
  }
}

export default MemoryStore;
