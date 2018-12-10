import { test, validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { isMiddlewarePivot } from 'oors-express/build/validators';
import idValidator from './idValidator';
import ValidationError from './ValidationError';
import validationErrorHandler from './middlewares/validationErrorHandler';

class AJVModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      validationMiddlewarePivot: [
        v.isDefault({
          before: 'errorHandler',
        }),
        isMiddlewarePivot(),
      ],
    }),
  );

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

      Object.assign(repository, {
        isValid,
        validate: (data = {}) => {
          if (!isValid(data)) {
            throw new ValidationError(isValid.errors);
          }
          return data;
        },
      });
    });

    this.exportProperties(['validate']);
  }

  async setup() {
    await this.loadDependencies(['oors.express']);
    this.deps['oors.express'].middlewares.insert(this.getConfig('validationMiddlewarePivot'), {
      path: '/',
      ...validationErrorHandler,
    });
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
