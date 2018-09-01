class Service {
  constructor(module) {
    this.module = module;
    this.app = module.app;
    this.name = this.constructor.name;
    // this.repositories = proxy to repositories
  }
}

export default Service;
