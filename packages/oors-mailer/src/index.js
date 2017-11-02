import { Module } from 'oors';
import express from 'express';
import serverIndex from 'serve-index';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import pivotSchema from 'oors/build/schemas/pivot';
import MailService from './services/Mail';

class Mailer extends Module {
  static configSchema = {
    type: 'object',
    properties: {
      transport: {
        type: 'object',
        default: {
          jsonTransport: true,
        },
      },
      saveToDisk: {
        type: 'boolean',
        default: 'false',
      },
      emailsDir: {
        type: 'string',
      },
      middlewarePivot: pivotSchema,
    },
    required: ['emailsDir'],
  };

  name = 'oors.mailer';

  initialize({ middlewarePivot }) {
    this.app.middlewares.insert(
      middlewarePivot,
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
  }

  async setup({ transport, emailsDir, saveToDisk }) {
    const Mail = new MailService({
      transport,
      emailsDir,
      saveToDisk,
      renderTemplate: (component, context = {}) =>
        ReactDOMServer.renderToStaticMarkup(React.createElement(component, context)),
    });

    this.export({
      Mail,
      send: (...args) => Mail.send(...args),
    });
  }
}

export default Mailer;
