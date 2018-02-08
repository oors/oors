/* eslint-disable no-underscore-dangle */
import pick from 'lodash/pick';
import getPath from 'lodash/get';
import setPath from 'lodash/set';
import camelCase from 'lodash/camelCase';

class Module {
  constructor(config = {}) {
    this.filePath = new Error().stack
      .toString()
      .split(/\r\n|\n/)[2]
      .match(/\((.*.js)/)[1];

    this.hooks = {};
    this.config = config;
    this.deps = {};
  }

  get name() {
    return this.config.name || this._name || camelCase(this.constructor.name);
  }

  set name(name) {
    this._name = name;
  }

  initialize(config, manager) {} // eslint-disable-line
  setup(config, manager) {} // eslint-disable-line

  setConfig(key, value) {
    setPath(this.config, key, value);
  }

  getConfig(key, defaultValue) {
    return key ? getPath(this.config, key, defaultValue) : this.config;
  }

  get manager() {
    if (!this._manager) {
      throw new Error('You need to connect the module to a manager in order to get access to it!');
    }

    return this._manager;
  }

  get app() {
    return this.context.app;
  }

  get context() {
    return this.manager.context;
  }

  export(map) {
    return Object.assign(this.manager.exportMap[this.name], map);
  }

  exportProperties(props) {
    this.export(pick(this, props));
  }

  get(key) {
    if (!Object.keys(this.manager.exportMap[this.name]).includes(key)) {
      throw new Error(`Unable to get exported value for "${key}" key in "${this.name}" module!`);
    }

    return this.manager.exportMap[this.name][key];
  }

  connect(manager) {
    this._manager = manager;
    this.emit('before:initialize');
    this.initialize(this.config, manager);
    this.emit('after:initialize');
  }

  async load() {
    this.emit('before:setup');
    await this.setup(this.config, this.manager);
    this.emit('after:setup');
  }

  dependency(dependency) {
    if (typeof dependency !== 'string') {
      throw new Error(`Unexpected dependency name: ${dependency}!`);
    }
    this.manager.addDependency(this.name, dependency);
    return this.manager.loads[dependency];
  }

  dependencies(dependencies) {
    return Promise.all(dependencies.map(this.dependency.bind(this)));
  }

  async loadDependency(name) {
    this.deps[name] = await this.dependency(name);
    return this.deps[name];
  }

  loadDependencies(dependencies) {
    return Promise.all(dependencies.map(this.loadDependency.bind(this)));
  }

  on(event, listener) {
    return this.manager.on(event, listener);
  }

  once(event, listener) {
    return this.manager.once(event, listener);
  }

  emit(event, ...args) {
    return this.manager.emit(`module:${this.name}:${event}`, ...args.concat([this]));
  }

  runHook(hook, handler, context) {
    return this.manager.run(`${this.name}.${hook}`, handler, context);
  }

  addHook(moduleName, hook, handler = () => {}) {
    this.hooks[`${moduleName}.${hook}`] = handler;
    return this;
  }
}

export default Module;
