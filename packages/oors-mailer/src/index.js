import { test, validators as v } from 'easevalidation';
import { Module } from 'oors';
import express from 'express';
import serverIndex from 'serve-index';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import MailService from './services/Mail';

class Mailer extends Module {
  static validateConfig = test(
    v.isSchema({
      transport: [
        v.isDefault({
          jsonTransport: true,
        }),
        v.isObject(),
      ],
      saveToDisk: [v.isDefault(false), v.isBoolean()],
      emailsDir: [v.isRequired(), v.isString()],
      middlewarePivot: v.isAny(
        v.isString(),
        v.isSchema({
          before: v.isAny(v.isString(), v.isUndefined()),
          after: v.isAny(v.isString(), v.isUndefined()),
        }),
      ),
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
