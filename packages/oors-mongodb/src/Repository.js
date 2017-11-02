/* eslint-disable no-underscore-dangle */
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import ValidationError from 'oors/build/errors/ValidationError';
import Store from './Store';
import idValidator from './libs/idValidator';

class Repository extends Store {
  static getCollectionName() {
    return this.collectionName || this.name.substr(0, this.name.indexOf('Repository'));
  }

  constructor({ collection, schema, collectionName } = {}) {
    super(collection);

    this.setupValidator();

    this.schema = schema || this.constructor.schema;
    this.collectionName = collectionName || this.constructor.getCollectionName();
  }

  setupValidator() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      async: 'es7',
      useDefaults: true,
    });

    ajvKeywords(this.ajv, 'instanceof');

    this.ajv.addKeyword('isId', idValidator);
  }

  set schema(schema) {
    this.validate = () => true;
    this._schema = schema;

    if (schema) {
      this.validate = this.ajv.compile(this.schema);
    }
  }

  get schema() {
    return this._schema;
  }

  async parse(data) {
    if (!this.validate(data)) {
      throw new ValidationError(this.validate.errors);
    }

    return data;
  }
}

export default Repository;
