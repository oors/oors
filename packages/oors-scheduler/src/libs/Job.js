/* eslint-disable class-methods-use-this */

class Job {
  constructor(agenda, module) {
    this.agenda = agenda;
    this.module = module;
    this.name = this.name || this.constructor.name;
    this.getConfig();
  }

  getConfig() {}

  // eslint-disable-next-line no-unused-vars
  run(module) {
    throw new Error('Not implemented!');
  }

  async save(schedulerModule) {
    return schedulerModule.defineJob(
      this.name,
      async () => this.run(this.module),
      this.getConfig(),
    );
  }
}

export default Job;
