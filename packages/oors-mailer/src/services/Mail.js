import nodemailer from 'nodemailer';
import { ServiceContainer, decorators } from 'octobus.js';
import fs from 'fs-extra';

const { service } = decorators;

class Mail extends ServiceContainer {
  constructor(options) {
    super();
    this.options = options;
    this.transporter = nodemailer.createTransport(this.options.transport);
  }

  @service()
  async send(options) {
    const { template, context } = options;

    const html = await this.options.renderTemplate(template, context);

    Object.assign(options, { html });

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, info) => {
        if (err) {
          return reject(err);
        }

        return resolve(info);
      });
    }).then(this.saveToDisk.bind(this));
  }

  async saveToDisk(info) {
    if (this.options.saveToDisk && this.options.transport.jsonTransport) {
      const { subject, html } = JSON.parse(info.message);
      const emailPath = `${this.options
        .emailsDir}/${new Date().getTime()} - ${subject}.html`;

      await fs.writeFile(emailPath, html);
    }

    return info;
  }
}

export default Mail;
