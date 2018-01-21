import nodemailer from 'nodemailer';
import fs from 'fs-extra';

class Mail {
  constructor(options) {
    this.options = options;
    this.transporter = nodemailer.createTransport(this.options.transport);
  }

  async send(options) {
    const { context } = options;

    if (!options.html && options.template) {
      const html = await this.options.renderTemplate(options.template, context);
      Object.assign(options, { html });
    }

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, info) => {
        if (err) {
          return reject(err);
        }

        return resolve(info);
      });
    }).then(this.saveToDisk);
  }

  saveToDisk = async info => {
    if (this.options.saveToDisk && this.options.transport.jsonTransport) {
      const { subject, html } = JSON.parse(info.message);
      const emailPath = `${this.options.emailsDir}/${new Date().getTime()} - ${subject}.html`;

      await fs.writeFile(emailPath, html);
    }

    return info;
  };
}

export default Mail;
