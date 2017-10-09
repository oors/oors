import { ServiceBus } from 'octobus.js';

export default class extends ServiceBus {
  // eslint-disable-next-line
  registerServices(services) {
    if (Array.isArray(services)) {
      return services.map(service => this.register(service));
    }
    return Object.keys(services).reduce(
      (acc, serviceName) => ({
        ...acc,
        [serviceName]: this.register(serviceName, services[serviceName]),
      }),
      {},
    );
  }
}
