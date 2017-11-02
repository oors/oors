import flow from 'lodash/flow';
import ValidationError from 'oors/build/errors/ValidationError';

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

export const withArgs = parser => resolver => async (_, args, ctx, info) =>
  resolver(_, await parser(args, ctx), ctx, info);

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
