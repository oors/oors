/* eslint-disable class-methods-use-this */

class Job {
  constructor(agenda) {
    this.agenda = agenda;
    this.name = this.name || this.constructor.name;
    this.getConfig();
  }

  getConfig() {}

  run() {
    throw new Error('Not implemented!');
  }

  async save(module) {
    return module.defineJob(this.name, this.run, this.getConfig());
  }
}

export default Job;
