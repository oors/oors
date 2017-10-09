/* eslint-disable class-methods-use-this */

class NullStore {
  setMessageBus() {}

  save() {}

  find() {
    return [];
  }

  findChildren() {
    return {};
  }
}

export default NullStore;
