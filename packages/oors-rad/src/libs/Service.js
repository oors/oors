class Service {
  constructor(module) {
    this.module = module;
    this.modules = module.manager;
    if (!this.name) {
      this.name = this.constructor.name;
    }
    // this.repositories = proxy to repositories
  }
}

export default Service;
