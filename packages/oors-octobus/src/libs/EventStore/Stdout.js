/* eslint-disable class-methods-use-this */
import Null from './Null';

class Stdout extends Null {
  constructor(log = console.log.bind(console)) {
    super();
    this.log = log;
  }

  setMessageBus(messageBus) {
    messageBus.onMessage(msg => {
      this.log(JSON.stringify(msg, null, 2));
    });
  }

  save() {}

  find() {
    return [];
  }

  findChildren() {
    return {};
  }
}

export default Stdout;
