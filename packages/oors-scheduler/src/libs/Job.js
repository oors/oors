/* eslint-disable class-methods-use-this */

class Job {
  constructor(agenda) {
    this.agenda = agenda;
    this.name = this.name || this.constructor.name;
    this.getConfig();
  }

  getConfig() {}

  // eslint-disable-next-line no-unused-vars
  run(module) {
    throw new Error('Not implemented!');
  }

  async save(module) {
    return module.defineJob(this.name, () => this.run(module), this.getConfig());
  }
}

export default Job;
