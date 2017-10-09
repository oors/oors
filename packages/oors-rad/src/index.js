import { Module } from 'oors';

class RAD extends Module {
  name = 'oors.rad';

  constructor(...args) {
    super(...args);
    this.modules = {};
  }

  createRelation({ from, to, type }) {}

  createModel({ name, schema, module, relations }) {
    const repository = this.modules['oors.mongodb'].createRepository({
      name,
      schema,
    });

    if (module) {
      const services = this.modules['oors.octobus'].registerServices(module, {
        [name]: repository,
      });

      module.export(services);
    }

    return repository;
  }

  generateTools(module) {
    return {
      createModel: (...args) =>
        this.createModel({
          ...args,
          module,
        }),
      loadModules: (...args) => this.loadModules(...args),
    };
  }

  async loadModules(modules) {
    const exportsList = await this.dependencies(modules);
    modules.forEach((module, index) => {
      this.modules[module] = exportsList[index];
    });
  }

  async setup() {
    await this.loadModules(['oors.mongodb', 'oors.octobus']);
    const helpers = {
      generateTools: this.generateTools.bind(this),
    };

    this.createHook(
      'createModels',
      module => {
        if (module.models) {
          module.models.forEach(model => {
            this.createModel({
              ...model,
              module,
            });
          });
        }
      },
      helpers,
    );

    this.export(helpers);
  }
}

export default RAD;
