import assert from 'assert';
import Config, { stores } from '../src';

const { Memory } = stores;
const config = new Config();
const store = new Memory({
  it: 'works',
});

config.addStore(store);

config
  .get('it')
  .then(value => {
    assert.equal(value, 'works');
  })
  .catch(console.log);
