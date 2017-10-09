class ModuleTools {
  constructor(rad, module) {
    this.module = module;
    this.rad = rad;
  }

  createModel({ name, schema, relations }) {
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
}

export default ModuleTools;
