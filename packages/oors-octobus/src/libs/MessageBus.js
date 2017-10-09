import { MessageBus as OriginalMessageBus, Message } from 'octobus.js';

class MessageBus extends OriginalMessageBus {
  call(name, params) {
    return this.send(
      new Message({
        topic: name,
        data: params,
      }),
    );
  }
}

export default MessageBus;
