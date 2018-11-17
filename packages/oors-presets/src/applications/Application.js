import { ModulesManager } from 'oors';

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
}

export default Application;
