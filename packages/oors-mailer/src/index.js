import { Module } from 'oors';
import Joi from 'joi';
import express from 'express';
import serverIndex from 'serve-index';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import MailService from './services/Mail';

class Mailer extends Module {
  static configSchema = {
    transport: Joi.object().default({
      jsonTransport: true,
    }),
    saveToDisk: Joi.boolean().default(false),
    emailsDir: Joi.string().required(),
    templatesDir: Joi.string().required(),
    middlewarePivot: Joi.any().required(),
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
    const { registerServices } = await this.dependency('oors.octobus');
    const { Mail } = registerServices(this, {
      Mail: new MailService({
        transport,
        emailsDir,
        saveToDisk,
        renderTemplate: (component, context = {}) =>
          ReactDOMServer.renderToStaticMarkup(
            React.createElement(component, context),
          ),
      }),
    });

    this.export({
      Mail,
      send: (...args) => Mail.send(...args),
    });
  }
}

export default Mailer;
