import assert from 'assert';
import Config, { stores } from '../src';

const { Memory } = stores;
const config = new Config();
const store1 = new Memory({
  port: 3000,
});
const store2 = new Memory({
  port: 3001,
});

config.addStore(store1);
config.addStore(store2);

const run = async () => {
  assert.equal(await config.get('port'), 3001);

  store2.set('port', 4000);

  assert.equal(await config.get('port'), 3001); // the value was cached
};

run().catch(console.log);
