import { application, request, response } from 'express';
import { createServer } from 'http';
import mixin from 'merge-descriptors';
import EventEmitter from 'events';
import omit from 'lodash/omit';

class ExpressApplication extends EventEmitter {
  constructor() {
    super();
    this.originalApp = application;
    mixin(this, omit(this.originalApp, ['listen']), false);
    this.init();
    this.request = request;
    this.request.app = this;
    this.response = response;
    this.response.app = this;
  }

  get server() {
    if (!this.httpServer) {
      this.httpServer = createServer(this.handle.bind(this));
    }

    return this.httpServer;
  }

  listen(...args) {
    return this.server.listen(...args);
  }
}

export default ExpressApplication;
