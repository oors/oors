import { test, validators as v } from 'easevalidation';
import { Module } from 'oors';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import idValidator from './idValidator';
import ValidationError from './ValidationError';

class AJVModule extends Module {
  name = 'oors.ajv';

  hooks = {
    'oors.graphql.buildContext': ({ context }) => {
      Object.assign(context, {
        ajv: this.ajv,
      });
    },
  };

  initialize() {
    const ajv = new Ajv({
      allErrors: true,
      async: 'es7',
      coerceTypes: 'array',
      useDefaults: true,
    });

    ajvKeywords(ajv, 'instanceof');
    ajv.addKeyword('isObjectId', idValidator);
    this.ajv = ajv;
    this.manager.ajv = ajv;

    this.onModule('oors.mongodb', 'repository', ({ repository }) => {
      if (!repository.schema || !test(v.isJSONSchema())(repository.schema)) {
        return;
      }

      const isValid = this.ajv.compile(repository.schema);
      const validate = (data = {}) => {
        if (!isValid(data)) {
          throw new ValidationError(isValid.errors);
        }
        return data;
      };

      Object.assign(repository, {
        isValid,
        validate,
      });
    });

    this.exportProperties(['validate']);
  }

  validate = (data, schema) => {
    const validator = this.ajv.compile(schema);

    if (!validator(data)) {
      throw new ValidationError(validator.errors);
    }

    return data;
  };
}

export default AJVModule;
