/* eslint-disable import/no-extraneous-dependencies */
import Joi from 'joi';
import { transformFileSync } from 'babel-core';
import path from 'path';
import fse from 'fs-extra';
import fs from 'fs';
import glob from 'glob';
import yargs from 'yargs';
import omit from 'lodash/omit';
import argsSchema from '../schemas/args';

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
  getPackgeJSFiles({ pkg, srcDir, globPattern: '**/*.js?(x)' });

export const isJSFile = file => ['.js', '.jsx'].includes(path.extname(file));

export const getBuildDestinationPath = ({
  srcPath,
  packagesDir,
  srcDir,
  buildDir,
}) => {
  const pkgName = path.relative(packagesDir, srcPath).split(path.sep)[0];
  const pkg = path.resolve(packagesDir, pkgName);
  const pkgSrcDir = path.resolve(pkg, srcDir);
  const pkgBuildDir = path.resolve(pkg, buildDir);
  const relativeToSrcPath = path.relative(pkgSrcDir, srcPath);
  return path.resolve(pkgBuildDir, relativeToSrcPath);
};

export const compileFile = async ({
  file,
  babelConfig,
  packagesDir,
  srcDir,
  buildDir,
}) => {
  const destPath = getBuildDestinationPath({
    srcPath: file,
    packagesDir,
    srcDir,
    buildDir,
  });

  if (!isJSFile(file)) {
    return fse.copy(file, destPath);
  }

  const transformed = transformFileSync(file, babelConfig).code;
  return fse.outputFile(destPath, transformed);
};

export const makeConfig = (config = {}) => {
  const finalConfig = {
    packagesDir: path.resolve('./packages'),
    babelConfig: fse.readJsonSync(path.resolve('./.babelrc')),
    watchGlob: [path.resolve('./packages/*/src/**')],
    ...omit(yargs.array('watchGlob').array('ignoredPackages').argv, [
      '_',
      '$0',
    ]),
    ...config,
  };

  try {
    const oorsConfig = require(`${process.cwd()}/oors.config.js`); // eslint-disable-line
    Object.assign(finalConfig, oorsConfig.default || oorsConfig);
  } catch (err) {
    console.log('Unable to locate a oors.config.js file.'); // eslint-disable-line no-console
  }

  return Joi.attempt(finalConfig, argsSchema);
};
