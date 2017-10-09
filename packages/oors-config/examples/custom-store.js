import assert from 'assert';
import Config, { stores } from '../src';

const { Memory: MemoryStore } = stores;

class CustomStore extends MemoryStore {
  set(key, value) {
    super.set(key, typeof value === 'number' ? value + 1 : value);
  }

  async get(key, nextStore) {
    const value = await MemoryStore.prototype.get.call(this, key, nextStore);
    await new Promise(resolve => setTimeout(resolve), 1000);
    return value;
  }
}

const config = new Config();
const store = new CustomStore();

config.addStore(store);

store.set('port', 3000);
store.set('email', 'test@example.com');

const run = async () => {
  const [port, email] = await config.multiGet(['port', 'email']);
  assert.equal(port, 3001);
  assert.equal(email, 'test@example.com');
};

run().catch(console.log);
