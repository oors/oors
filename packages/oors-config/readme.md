oors-config provides a comprehensive way to manage configuration for your project.

A glimpse of how configuration works:

```js
import Config, { stores } from 'oors-config';

const { Memory } = stores; // keeps the data in memory
const config = new Config();
const store = new Memory({
  // some initial data for the store
  it: 'works',
});

config.addStore(store); // we add the store to the stack of stores

// config.get always returns a promise
config.get('it').then(value => {
  console.log(value); // "works"
});
```

The idea behind configuration is that you initialize a Config object and then you add different data
stores to it.

The Config object will provide a read-only interface for the data that's in the stores - you can't
write to the Config object - you have to do that through the stores you add to it. It will also
maintain a stack of stores. When you ask it for some data, it will first try to get it from the last
store added to the stack, then the one before it etc..

If it finds some data, it will be cached so that it's retrieved very fast on subsequent calls. It
will be developer's responsibility to clear the cache if he made changes to the stores. You can also
disable this caching by instantiating a Config object with a null cache.

For now there are only 2 types of data stores available: Memory (stores the data in memory) and Env
(reads / writes to process.env). Later on more types of stores will be added: MongoDB, Redis, JSON,
Http etc.

```js
import Config, { stores, caches } from '../index';

const { Memory } = stores;
const { Null } = caches;
// the first argument of a Config object is a cache instance and we're going to use a Null cache to disable any caching from happening
const config = new Config(new Null());
const store = new Memory({
  it: 'works',
});

config.addStore(store);

config.get('it').then(value => {
  console.log(value); // "works"
});
```

A common scenario to manage your configuration for an app is the following:

* you create a Config instance and use it as a singleton at the application level
* the stores that will be added to the Config object are:
  * a Memory store that you'll use to setup some default configuration
  * an Env store for machine specific configuration (passwords, keys etc)
  * a db-aware store (Mongo, Redis) - for application configuration that can be managed by an admin
    user through some UI (list of blacklisted / whitelisted IPs etc)
* you can use a Memory cache when instantiating the Config object, but don't forget to clear this
  cache whenever you're making changes changes to the stores.

You can clear the cache either by running `Config.clearCache(key)` or `Config.clearCache()`, where
the last one with clear the entire cache.
