import omit from 'lodash/omit';
import path from 'path';
import fse from 'fs-extra';

const getExports = filePath => {
  const exportMap = require(filePath); // eslint-disable-line
  return Object.assign(exportMap.default || {}, omit(exportMap, 'default'));
};

export const loadResolvers = async dirPath => {
  const files = await fse.readdir(dirPath);
  const map = {};
  await Promise.all(
    files.map(async file => {
      const filePath = path.join(dirPath, file);
      const stat = await fse.stat(filePath);
      const isDirectory = stat && stat.isDirectory();
      if (isDirectory) {
        map[file] = await loadResolvers(filePath);
        return;
      }

      const extension = path.extname(file);
      if (extension !== '.js') {
        return;
      }
      const filename = file.substr(0, file.length - extension.length);
      const exportMap = getExports(filePath);

      if (filename === 'index') {
        Object.assign(map, exportMap);
      } else {
        map[filename] = exportMap;
      }
    }),
  );

  return map;
};
