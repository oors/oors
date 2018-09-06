#!/usr/bin/env node
import * as babel from '@babel/core';
import path from 'path';
import fse from 'fs-extra';
import { getPackageDirs, getPackageFiles, makeConfig, isJSFile } from '../libs/utils';

process.on('unhandledRejection', reason => console.log(reason)); // eslint-disable-line
process.on('uncaughtException', err => console.log(err)); // eslint-disable-line

const run = async ({ packagesDir, babelConfig, ignoredPackages, srcDir, buildDir }) => {
  const packages = await getPackageDirs({ packagesDir, ignoredPackages });

  return Promise.all(
    packages.map(async pkg => {
      const pkgSrcDir = path.resolve(pkg, srcDir);
      const pkgBuildDir = path.resolve(pkg, buildDir);
      const files = getPackageFiles({ pkg, srcDir });

      await fse.ensureDir(pkgBuildDir);
      await fse.emptyDir(pkgBuildDir);

      return Promise.all(
        files.map(file => {
          const relativeToSrcPath = path.relative(pkgSrcDir, file);
          const destPath = path.resolve(pkgBuildDir, relativeToSrcPath);

          if (!isJSFile(file)) {
            return fse.copy(file, destPath);
          }

          const transformed = babel.transformFileSync(file, babelConfig).code;
          return fse.outputFile(destPath, transformed);
        }),
      );
    }),
  );
};

run(makeConfig());
