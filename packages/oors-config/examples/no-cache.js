import assert from 'assert';
import Config, { stores, caches } from '../src';

const { Null: NullCache } = caches;
const { Memory } = stores;
const config = new Config(new NullCache());
const store = new Memory({
  port: 3000,
});

config.addStore(store);

const run = async () => {
  assert.equal(await config.get('port'), 3000);

  store.set('port', 4000);

  assert.equal(await config.get('port'), 4000);
};

run().catch(console.log);
