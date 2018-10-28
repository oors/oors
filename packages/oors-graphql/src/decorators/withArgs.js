import isPlainObject from 'lodash/isPlainObject';

const replaceValues = (arg, values, replacers) => {
  if (Array.isArray(arg)) {
    return arg.map(item => replaceValues(item, values, replacers));
  }

  if (isPlainObject(arg)) {
    return Object.keys(arg).reduce(
      (acc, key) => ({
        ...acc,
        [key]: replaceValues(arg[key], values, replacers),
      }),
      {},
    );
  }

  if (values.includes(arg)) {
    return replacers[values.indexOf(arg)];
  }

  return arg;
};

export default transformer => resolver => async (_, args, ctx, info) => {
  const keys = [];
  const promises = [];

  let finalArgs = await transformer(_, args, ctx, info, {
    resolve: promise => {
      const key = Symbol(keys.index);
      keys.push(key);
      promises.push(promise);
      return key;
    },
  });

  if (promises.length) {
    finalArgs = replaceValues(finalArgs, keys, await Promise.all(promises));
  }

  return resolver(_, finalArgs, ctx, info);
};
