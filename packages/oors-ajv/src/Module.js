import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
import { Module } from 'oors';
import ValidationError from './ValidationError';

const ajv = new Ajv({
  allErrors: true,
  async: 'es7',
  coerceTypes: 'array',
  useDefaults: true,
});

ajvKeywords(ajv, 'instanceof');

export default class extends Module {
  static validateConfig(config, configSchema) {
    const schema = configSchema || this.schema;
    if (!schema) {
      return config;
    }

    const validate = ajv.compile({
      type: 'object',
      ...schema,
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
        },
        ...(schema.properties || {}),
        name: {
          type: 'string',
        },
      },
    });

    if (!validate(config)) {
      throw new ValidationError(validate.errors, `Invalid "${module.name}" module configuration!`);
    }

    return config;
  }
}
