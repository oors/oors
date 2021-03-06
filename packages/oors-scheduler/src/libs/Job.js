/* eslint-disable class-methods-use-this */

class Job {
  constructor(agenda, module) {
    this.agenda = agenda;
    this.module = module;
    this.name = this.name || this.constructor.name;
  }

  getConfig() {
    return this.config || {};
  }

  // eslint-disable-next-line no-unused-vars
  run() {
    throw new Error('Not implemented!');
  }

  async save(schedulerModule) {
    const { name, ...config } = {
      name: this.name,
      ...this.getConfig(),
    };

    return schedulerModule.defineJob(name, this.run.bind(this), config);
  }
}

export default Job;
