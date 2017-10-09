#!/usr/bin/env node
import { transformFileSync } from 'babel-core';
import path from 'path';
import fse from 'fs-extra';
import {
  getPackageDirs,
  getPackageFiles,
  makeConfig,
  isJSFile,
} from '../libs/utils';

const run = async ({
  packagesDir,
  babelConfig,
  ignoredPackages,
  srcDir,
  buildDir,
}) => {
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

          const transformed = transformFileSync(file, babelConfig).code;
          return fse.outputFile(destPath, transformed);
        }),
      );
    }),
  );
};

run(makeConfig());
