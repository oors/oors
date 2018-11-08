#!/usr/bin/env node
import * as babel from '@babel/core';
import path from 'path';
import fse from 'fs-extra';
import chokidar from 'chokidar';
import fs from 'fs';
import yargs from 'yargs';
import { isJSFile } from '../libs/utils';

process.on('unhandledRejection', reason => console.log(reason)); // eslint-disable-line
process.on('uncaughtException', err => console.log(err)); // eslint-disable-line

export const getBuildDestinationPath = ({ file, srcDir, buildDir }) =>
  path.resolve(buildDir, path.relative(srcDir, file));

export const compileFile = async ({ file, srcDir, buildDir }) => {
  const destPath = getBuildDestinationPath({
    file,
    srcDir,
    buildDir,
  });

  if (!isJSFile(file)) {
    return fse.copy(file, destPath);
  }

  const { code } = await babel.transformFileAsync(file);
  return fse.outputFile(destPath, code);
};

const run = async ({ srcDir, buildDir }) => {
  const watcher = chokidar.watch(path.join(srcDir, '**'), {
    ignoreInitial: true,
  });

  watcher.on('add', file => compileFile({ file, srcDir, buildDir }));
  watcher.on('change', file => compileFile({ file, srcDir, buildDir }));
  watcher.on('unlink', file => fs.unlinkSync(getBuildDestinationPath({ file, srcDir, buildDir })));
  watcher.on('unlinkDir', file => fse.remove(getBuildDestinationPath({ file, srcDir, buildDir })));

  return watcher;
};

const { argv } = yargs;

run({
  srcDir: argv.src || 'src',
  buildDir: argv.build || 'build',
});
