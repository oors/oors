import { Module } from 'oors';
import glob from 'glob';
import fse from 'fs-extra';
import path from 'path';
import Agenda from 'agenda';

class SchedulerModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      agendaConfig: {
        type: 'object',
        default: {},
      },
      autoloadJobs: {
        type: 'boolean',
        default: true,
      },
      moduleJobsDir: {
        type: 'string',
        default: 'jobs',
      },
      isWorker: {
        type: 'boolean',
        default: true,
      },
    },
    required: [],
  };

  name = 'oors.scheduler';

  async setup({ isWorker }) {
    await this.loadDependencies(['oors.mongodb', 'oors.logger']);

    this.agenda = new Agenda({
      mongo: this.deps['oors.mongodb'].getConnectionDb(),
      ...this.getConfig('agendaConfig'),
    });

    this.export({
      agenda: this.agenda,
      defineJob: this.defineJob,
      defineJobs: this.defineJobs,
      createJob: this.createJob,
    });

    await this.runHook('loadJobs', this.collectFromModule, {
      agenda: this.agenda,
      defineJob: this.defineJob,
      defineJobs: this.defineJobs,
    });

    this.agenda.on('error', err => {
      this.deps['oors.logger'].logError(err);
      throw err;
    });

    if (isWorker) {
      await this.agenda.start();
    }
  }

  teardown = () => this.agenda.stop();

  createJob = (name, data) =>
    new Promise((resolve, reject) => {
      const job = this.agenda.create(name, data);
      job.save(err => {
        if (err) {
          reject(err);
        } else {
          resolve(job);
        }
      });
    });

  defineJobs = jobs => {
    Object.keys(jobs).forEach(name => {
      if (typeof jobs[name] === 'function') {
        this.defineJob(name, jobs[name]);
      } else {
        const { handler, options } = jobs[name];
        this.defineJob(name, handler, options);
      }
    });
  };

  defineJob = async (name, handler, options = {}) => {
    const { interval, data, intervalOptions, schedule, now, ...restOptions } = {
      data: null,
      intervalOptions: {},
      ...options,
    };

    this.agenda.define(name, restOptions, async (job, done) => {
      try {
        await handler({ data: job.attrs.data });
        done();
      } catch (err) {
        this.deps['oors.logger'].logError(err);
        done(err);
      }
    });

    if (interval) {
      await this.agenda.every(interval, name, data, intervalOptions);
    }

    if (schedule) {
      await this.agenda.schedule(schedule, name, data);
    }

    if (now) {
      await this.agenda.now(name, data);
    }
  };

  collectFromModule = async module => {
    if (!module.getConfig('oors.scheduler.autoload', this.getConfig('autoloadJobs'))) {
      return;
    }

    await this.loadModuleJobs(module);
  };

  async loadModuleJobs(module) {
    const dirPath = path.resolve(path.dirname(module.filePath), this.getConfig('moduleJobsDir'));

    try {
      const stat = await fse.stat(dirPath);
      const isDirectory = stat && stat.isDirectory();
      if (!isDirectory) {
        return;
      }
    } catch (err) {
      return;
    }

    await new Promise((resolve, reject) => {
      glob(path.resolve(dirPath, '*.js'), { nodir: true }, async (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        await Promise.all(
          files.map(file => {
            const Job = require(file).default; // eslint-disable-line global-require, import/no-dynamic-require
            const job = new Job(this.agenda, module);
            return job.save(this);
          }),
        );

        resolve();
      });
    });
  }
}

export default SchedulerModule;
