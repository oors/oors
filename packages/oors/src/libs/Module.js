/* eslint-disable no-underscore-dangle */
import pick from 'lodash/pick';
import getPath from 'lodash/get';
import setPath from 'lodash/set';
import merge from 'lodash/merge';
import camelCase from 'lodash/camelCase';

class Module {
  constructor(config = {}) {
    const { stack } = new Error();
    this.filePath = stack
      .toString()
      .split(/\r\n|\n/)[2]
      .match(/\((.*.js)/)[1];

    this.hooks = {};
    this.config = merge({}, this.constructor.defaultConfig || {}, config);
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
  teardown(config, manager) {} // eslint-disable-line

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
    this.asyncEmit('before:setup');
    await this.setup(this.config, this.manager);
    this.asyncEmit('after:setup');
  }

  async unload() {
    this.asyncEmit('before:teardown');
    await this.teardown(this.config, this.manager);
    this.asyncEmit('after:teardown');
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

  on(...args) {
    return this.manager.on(...args);
  }

  onModule(module, event, handler) {
    return this.manager.on(`module:${module}:${event}`, handler);
  }

  once(...args) {
    return this.manager.once(...args);
  }

  emit(event, ...args) {
    return this.manager.emit(`module:${this.name}:${event}`, ...args.concat([this]));
  }

  asyncEmit(event, ...args) {
    return this.manager.asyncEmit(`module:${this.name}:${event}`, ...args.concat([this]));
  }

  runHook(hook, handler, context) {
    return this.manager.run(`${this.name}.${hook}`, handler, context);
  }

  addHook(moduleName, hook, handler = () => {}) {
    this.hooks[`${moduleName}.${hook}`] = handler;
    return this;
  }

  proxy(methods, receiver) {
    methods.forEach(method => {
      this[method] = receiver[method].bind(receiver);
    });

    this.exportProperties(methods);
  }
}

export default Module;
