/* eslint-disable no-underscore-dangle */
import util from 'util';
import pick from 'lodash/pick';
import getPath from 'lodash/get';
import setPath from 'lodash/set';
import hasPath from 'lodash/has';
import defaultsDeep from 'lodash/defaultsDeep';
import camelCase from 'lodash/camelCase';

class Module {
  static validateConfig = config => config;

  constructor(config = {}) {
    const { stack } = new Error();
    this.filePath = stack
      .toString()
      .split(/\r\n|\n/)[2]
      .match(/\((.*.js)/)[1];

    this.hooks = {};
    this.config = defaultsDeep(config, this.constructor.defaultConfig || {}, {
      enabled: true,
    });
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

  get context() {
    return this.manager.context;
  }

  export(name, value) {
    if (typeof name === 'object') {
      Object.assign(this.manager.exportMap[this.name], name);
      return;
    }

    if (typeof name === 'string') {
      setPath(this.manager.exportMap[this.name], name, value);
      return;
    }

    throw new Error(
      `Unable to export ${util.inspect(value)} in "${
        this.name
      }" module! (invalid type: "${typeof name}")`,
    );
  }

  exportProperties(props) {
    this.export(pick(this, props));
  }

  get(key) {
    if (!key) {
      return this.manager.exportMap[this.name];
    }

    if (!hasPath(this.manager.exportMap[this.name], key)) {
      throw new Error(`Unable to get exported value for "${key}" key in "${this.name}" module!`);
    }

    return getPath(this.manager.exportMap[this.name], key);
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

  on(event, handler) {
    return this.onModule(this.name, event, handler);
  }

  onModule(module, event, handler) {
    return this.manager.on(`module:${module}:${event}`, handler);
  }

  once(event, handler) {
    return this.onceModule(this.name, event, handler);
  }

  onceModule(module, event, handler) {
    return this.manager.once(`module:${module}:${event}`, handler);
  }

  emit(event, ...args) {
    return this.manager.emit(`module:${this.name}:${event}`, ...args.concat([this]));
  }

  asyncEmit(event, ...args) {
    return this.manager.asyncEmit(`module:${this.name}:${event}`, ...args.concat([this]));
  }

  runHook(hook, handler = () => {}, context = this) {
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
