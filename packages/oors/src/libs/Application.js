import ModulesManager from './ModulesManager';

class Application {
  constructor(config) {
    this.config = config;
    this.modules = new ModulesManager();
  }

  addModules(...modules) {
    modules.forEach(module => {
      Object.assign(module.config, this.config.get(`modules.${module.name}`, {}));
      this.modules.add(module);
    });
  }

  async boot() {
    await this.modules.setup();
  }

  async shutdown() {
    await this.modules.teardown();
  }
}

export default Application;
