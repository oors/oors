import { Module } from 'oors';
import { Client, Policy } from 'catbox';
import MemoryEngine from 'catbox-memory';

class Cache extends Module {
  static schema = {
    type: 'object',
    properties: {
      defaultCache: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          options: {
            type: 'object',
            default: {},
          },
        },
        required: ['name'],
        default: {},
      },
    },
  };

  name = 'oors.cache';

  policies = new Map();

  clients = new Map();

  hooks = {
    'oors.graphql.buildContext': ({ context }) => {
      Object.assign(context, {
        cache: {
          getPolicy: this.getPolicy,
        },
      });
    },
  };

  async setup({ defaultCache }) {
    await this.createMemoryClient(defaultCache.name, defaultCache.options);
    await this.runHook('load', () => {}, {
      createClient: this.createClient,
      createPolicy: this.createPolicy,
    });

    this.exportProperties([
      'createClient',
      'createMemoryClient',
      'getClient',
      'createPolicy',
      'getPolicy',
    ]);
  }

  teardown = () => Promise.all(Array.from(this.clients.values).map(client => client.stop()));

  createClient = async (name, engine, options) => {
    const client = new Client(engine, options);
    this.clients.set(name, client);
    await client.start();
    return client;
  };

  getClient = (name = this.getConfig('defaultCache.name')) => this.clients.get(name);

  createPolicy = (segment, options = {}, clientName) => {
    const policy = new Policy(
      { expiresIn: 1000 * 60 * 60, ...options },
      this.getClient(clientName),
      segment,
    );
    this.policies.set(segment, policy);
    return policy;
  };

  getPolicy = segment => this.policies.get(segment);

  createMemoryClient = (name, options) => this.createClient(name, MemoryEngine, options);
}

export default Cache;
