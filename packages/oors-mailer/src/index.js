import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import express from 'express';
import serverIndex from 'serve-index';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { isMiddlewarePivot } from 'oors-express/build/validators';
import MailService from './services/Mail';

class Mailer extends Module {
  static validateConfig = validate(
    v.isSchema({
      transport: [
        v.isDefault({
          jsonTransport: true,
        }),
        v.isObject(),
      ],
      saveToDisk: [v.isDefault(false), v.isBoolean()],
      emailsDir: [v.isRequired(), v.isString()],
      middlewarePivot: isMiddlewarePivot(),
      isDev: [v.isDefault(false), v.isBoolean()],
    }),
  );

  static defaultConfig = {
    oors: {
      rad: {
        autoload: {
          services: false,
        },
      },
    },
  };

  name = 'oors.mailer';

  hooks = {
    'oors.express.middlewares': ({ middlewares }) => {
      middlewares.insert(
        this.getConfig('middlewarePivot'),
        {
          id: 'browseEmails',
          path: '/emails',
          factory: () => express.static(this.getConfig('emailsDir')),
        },
        {
          id: 'serverIndexEmails',
          path: '/emails',
          factory: () => serverIndex(this.getConfig('emailsDir')),
        },
      );
    },
  };

  async setup({ transport, emailsDir, saveToDisk }) {
    await this.loadDependencies(['oors.logger']);

    this.Mail = new MailService({
      transport,
      emailsDir,
      saveToDisk,
      renderTemplate: (component, context = {}) =>
        ReactDOMServer.renderToStaticMarkup(React.createElement(component, context)),
    });

    this.exportProperties(['Mail', 'send']);
  }

  send = async (...args) => {
    const email = await this.Mail.send(...args);

    if (this.getConfig('transport.jsonTransport') && this.getConfig('isDev')) {
      this.deps['oors.logger'].info(JSON.stringify(JSON.parse(email.message), null, 2));
    }

    return email;
  };
}

export default Mailer;
