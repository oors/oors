import { application, request, response } from 'express';
import mixin from 'merge-descriptors';
import EventEmitter from 'events';
import omit from 'lodash/omit';

class ExpressApplication extends EventEmitter {
  constructor(context = {}) {
    super();
    this.originalApp = application;
    mixin(this, omit(this.originalApp, ['listen']), false);
    this.init();
    this.request = request;
    this.request.app = this;
    this.response = response;
    this.response.app = this;
    Object.assign(this.request, context);
  }

  listen(...args) {
    return this.server.listen(...args);
  }
}

export default ExpressApplication;
