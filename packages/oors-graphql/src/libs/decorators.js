import flow from 'lodash/flow';
import ValidationError from 'oors/build/errors/ValidationError';
import isPlainObject from 'lodash/isPlainObject';

export const withSchema = schema => {
  let validate;

  return resolver => (_, args, ctx, info) => {
    if (!validate) {
      validate = ctx.ajv.compile(schema);
    }

    if (!validate(args)) {
      throw new ValidationError(validate.errors);
    }

    return resolver(_, args, ctx, info);
  };
};

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

export const withArgs = parser => resolver => async (_, args, ctx, info) => {
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

export const withContext = fn => resolver => async (_, args, ctx, info) =>
  resolver(_, args, await fn(ctx), info);

export const compose = (...decorators) => flow(decorators.reverse());

export const resolver = definition => (target, propr, descriptor) => {
  Object.assign(descriptor, {
    enumerable: true,
  });

  Object.assign(descriptor.value, {
    isResolver: true,
    definition,
  });

  return descriptor;
};
