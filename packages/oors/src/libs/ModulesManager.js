import uniq from 'lodash/uniq';
import getPath from 'lodash/get';
import setPath from 'lodash/set';
import EventEmitter from 'events';

class ModulesManager extends EventEmitter {
  constructor(context = {}) {
    super();
    this.context = context;
    this.dependencyGraph = {};
    this.expandedDependencyGraph = {};
    this.loads = {};
    this.modules = {};
    this.exportMap = {};
  }

  setContext(key, value) {
    setPath(this.context, key, value);
    return this;
  }

  get(moduleName, path, defaultValue) {
    return path
      ? getPath(this.exportMap[moduleName], path, defaultValue)
      : this.exportMap[moduleName];
  }

  add(module) {
    if (Array.isArray(module)) {
      module.forEach(this.add.bind(this));
      return this;
    }

    const { name } = module;
    this.modules[name] = module;
    this.exportMap[name] = {};
    this.dependencyGraph[name] = [];
    this.expandedDependencyGraph[name] = [];
    this.loads[name] = new Promise(resolve => {
      this.on(`module:${name}:after:setup`, () => {
        this.emit('module:loaded', module);
        resolve(this.exportMap[name]);
      });
    });
    module.connect(this);
    return this;
  }

  setup() {
    return Promise.all(
      Object.keys(this.modules).map(name => this.modules[name].load()),
    );
  }

  addDependency(from, to) {
    if (from === to) {
      throw new Error(
        `Cyclic dependency detected - module "${from}" waits for itself to load!`,
      );
    }

    if (!this.getModuleNames().includes(to)) {
      throw new Error(
        `Can't find module "${to}" required by "${from}" through the list of registered modules: "${this.getModuleNames()}"!`,
      );
    }

    this.dependencyGraph[from].push(to);
    Object.keys(this.expandedDependencyGraph)
      .filter(
        node =>
          node === from || this.expandedDependencyGraph[node].includes(from),
      )
      .forEach(node => {
        this.expandedDependencyGraph[node] = uniq([
          ...this.expandedDependencyGraph[node],
          to,
          ...this.expandedDependencyGraph[to],
        ]);
        if (this.expandedDependencyGraph[node].includes(node)) {
          throw new Error(
            `Cyclic dependency detected from "${from}" to "${to}"!`,
          );
        }
      });
  }

  getModules() {
    return Object.keys(this.modules).map(name => this.modules[name]);
  }

  getModuleNames() {
    return Object.keys(this.modules);
  }

  getModule(name) {
    return this.modules[name];
  }

  invoke(hookName, context) {
    const hooks = this.getModules()
      .map(module => module.hooks[hookName])
      .filter(hook => typeof hook === 'function');
    return hooks.length
      ? Promise.all(hooks.map(hook => hook(context)))
      : Promise.resolve();
  }

  async run(commandName, command, context) {
    await this.invoke(`before:${commandName}`, context);
    const results = await Promise.all(
      this.getModules().map(module => {
        if (module.hooks[commandName]) {
          return module.hooks[commandName](context);
        }
        return command(module, context);
      }),
    );
    await this.invoke(`after:${commandName}`, context);
    return results;
  }
}

export default ModulesManager;
