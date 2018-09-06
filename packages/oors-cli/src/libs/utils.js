/* eslint-disable import/no-extraneous-dependencies */
import Ajv from 'ajv';
import * as babel from '@babel/core';
import path from 'path';
import fse from 'fs-extra';
import fs from 'fs';
import glob from 'glob';
import yargs from 'yargs';
import omit from 'lodash/omit';
import argsSchema from '../schemas/args';

const validateArgs = new Ajv({
  allErrors: true,
  coerceTypes: 'array',
  useDefaults: true,
}).compile(argsSchema);

export const getPackageDirs = async ({ packagesDir, ignoredPackages }) =>
  (await fse.readdir(packagesDir))
    .map(file => path.resolve(packagesDir, file))
    .filter(file => fs.lstatSync(path.resolve(file)).isDirectory())
    .filter(dir => !ignoredPackages.includes(path.basename(dir)));

export const getPackageFiles = ({ pkg, srcDir, globPattern = '**' }) => {
  const pkgSrcDir = path.resolve(pkg, srcDir);
  const pattern = path.resolve(pkgSrcDir, globPattern);
  return glob.sync(pattern, { nodir: true });
};

export const getPackgeJSFiles = ({ pkg, srcDir }) =>
  getPackageFiles({ pkg, srcDir, globPattern: '**/*.js?(x)' });

export const isJSFile = file => ['.js', '.jsx'].includes(path.extname(file));

export const getBuildDestinationPath = ({ srcPath, packagesDir, srcDir, buildDir }) => {
  const [pkgName] = path.relative(packagesDir, srcPath).split(path.sep);
  const pkg = path.resolve(packagesDir, pkgName);
  const pkgSrcDir = path.resolve(pkg, srcDir);
  const pkgBuildDir = path.resolve(pkg, buildDir);
  const relativeToSrcPath = path.relative(pkgSrcDir, srcPath);
  return path.resolve(pkgBuildDir, relativeToSrcPath);
};

export const compileFile = async ({ file, babelConfig, packagesDir, srcDir, buildDir }) => {
  const destPath = getBuildDestinationPath({
    srcPath: file,
    packagesDir,
    srcDir,
    buildDir,
  });

  if (!isJSFile(file)) {
    return fse.copy(file, destPath);
  }

  const transformed = babel.transformFileSync(file, babelConfig).code;
  return fse.outputFile(destPath, transformed);
};

export const makeConfig = (config = {}) => {
  const finalConfig = {
    packagesDir: path.resolve('./packages'),
    babelConfig: require('../../../../babel.config'), // eslint-disable-line global-require
    watchGlob: [path.resolve('./packages/*/src/**')],
    ...omit(yargs.array('watchGlob').array('ignoredPackages').argv, ['_', '$0']),
    ...config,
  };

  try {
    const oorsConfig = require(`${process.cwd()}/oors.config.js`); // eslint-disable-line
    Object.assign(finalConfig, oorsConfig.default || oorsConfig);
  } catch (err) {
    console.log('Unable to locate a oors.config.js file.'); // eslint-disable-line no-console
  }

  if (!validateArgs(finalConfig)) {
    throw new Error(`Invalid args! \n ${JSON.stringify(validateArgs.errors)}`);
  }

  return finalConfig;
};
