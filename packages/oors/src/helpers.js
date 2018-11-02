// import path from 'path';
// import fs from 'fs';
import Ajv from 'ajv';
import ajvKeywords from 'ajv-keywords';
// import glob from 'glob';
import ValidationError from './errors/ValidationError';

export const validate = (data, schema, options = {}) => {
  const ajv = new Ajv({
    allErrors: true,
    async: 'es7',
    coerceTypes: 'array',
    useDefaults: true,
    ...options,
  });

  ajvKeywords(ajv, 'instanceof');

  const validator = ajv.compile(schema);

  if (!validator(data)) {
    throw new ValidationError(validator.errors);
  }

  return data;
};

// export const glob = (
//   dirPath,
//   globPattern = '*.js',
//   options = {
//     nodir: true,
//   },
// ) => {
//   const stat = fs.statSync(dirPath);
//   const isDirectory = stat && stat.isDirectory();
//   if (!isDirectory) {
//     return false;
//   }

//   return glob.sync(path.resolve(dirPath, globPattern), options).map(file => ({
//     export: require(file).default, // eslint-disable-line global-require, import/no-dynamic-require
//     file,
//   }));
// };
