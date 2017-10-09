import Joi from 'joi';

export default {
  srcDir: Joi.string().default('src'),
  buildDir: Joi.string().default('build'),
  packagesDir: Joi.string().required(),
  ignoredPackages: Joi.array().default([]),
  babelConfig: Joi.object().required(),
  watchGlob: Joi.array().default([]),
};
