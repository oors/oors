import Joi from 'joi';
import { Module } from 'oors';
import MessageBus from './libs/MessageBus';
import ServiceBus from './libs/ServiceBus';
import NullStore from './libs/EventStore/Null';

class Octobus extends Module {
  static configSchema = {
    messageBus: Joi.object().default(
      ({ messageBusOptions }) =>
        new MessageBus(MessageBus.createDefaultRouter(), messageBusOptions),
      'MessageBus instance',
    ),
    messageBusOptions: Joi.object().default({}),
    messageStore: Joi.object().default(
      () => new NullStore(),
      'MessageStore instance',
    ),
  };

  name = 'oors.octobus';

  constructor(...args) {
    super(...args);
    this.createServiceBus = this.createServiceBus.bind(this);
    this.registerServices = this.registerServices.bind(this);
  }

  initialize({ messageBus, messageStore }) {
    this.messageBus = messageBus;
    this.messageStore = messageStore;
    this.messageStore.setMessageBus(this.messageBus);
    this.serviceBus = this.createServiceBus('main');
  }

  createServiceBus(name, routes = []) {
    const serviceBus = new ServiceBus(name, routes);
    serviceBus.connect(this.messageBus);
    return serviceBus;
  }

  registerServices(module, serviceMap) {
    if (!serviceMap) {
      return this.serviceBus.registerServices(module);
    }

    if (!module.serviceBus) {
      // eslint-disable-next-line
      module.serviceBus = this.createServiceBus(module.name);
    }

    return module.serviceBus.registerServices(serviceMap);
  }

  async setup() {
    const {
      createServiceBus,
      registerServices,
      messageBus,
      messageStore,
    } = this;

    await this.createHook('createServiceBus', () => {}, {
      create: createServiceBus,
    });

    await this.createHook(
      'registerServices',
      module => {
        if (module.services) {
          this.registerServices(module, module.services);
        }
      },
      {
        register: registerServices,
      },
    );

    this.export({
      messageStore,
      messageBus,
      createServiceBus,
      registerServices,
    });
  }
}

export default Octobus;
