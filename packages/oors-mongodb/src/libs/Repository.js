/* eslint-disable no-underscore-dangle */
import Joi from 'joi';
import { CRUDServiceContainer } from 'octobus-crud';

class Repository extends CRUDServiceContainer {
  stamps = {
    user: true,
    time: true,
  };

  constructor(schema, collectionName) {
    super(schema);

    if (!this.schema) {
      this.schema = this.constructor.schema;
    }

    if (!this.collectionName) {
      this.collectionName =
        collectionName ||
        this.constructor.name.substr(0, this.constructor.name.indexOf('Repository'));
    }
  }

  set schema(schema) {
    this._schema = schema;
    this.addIdToSchema();
    this.addStamps();
  }

  get schema() {
    return this._schema;
  }

  addStamps() {
    if (!this.stamps) {
      return;
    }

    if (this.stamps.user) {
      Object.assign(this.schema, {
        createdBy: Joi.object(),
        updatedBy: Joi.object(),
      });
    }

    if (this.stamps.time) {
      Object.assign(this.schema, {
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
      });
    }
  }

  addIdToSchema() {
    if (this.schema._id) {
      return;
    }

    Object.assign(this.schema, {
      _id: Joi.object(),
    });
  }
}

export default Repository;
