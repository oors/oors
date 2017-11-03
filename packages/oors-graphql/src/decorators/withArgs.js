import isPlainObject from 'lodash/isPlainObject';

const replaceValues = (obj, values, replacers) => {
  Object.keys(obj).forEach(key => {
    const value = obj[key];

    if (isPlainObject(value)) {
      replaceValues(value, values, replacers);
    } else {
      const index = values.indexOf(value);
      if (index > -1) {
        obj[key] = replacers[index]; // eslint-disable-line no-param-reassign
      }
    }
  });
};

export default parser => resolver => async (_, args, ctx, info) => {
  const keys = [];
  const promises = [];

  const finalArgs = await parser(args, ctx, {
    resolve: promise => {
      const key = Symbol(keys.index);
      keys.push(key);
      promises.push(promise);
      return key;
    },
  });

  const values = await Promise.all(promises);

  replaceValues(finalArgs, keys, values);

  return resolver(_, finalArgs, ctx, info);
};
