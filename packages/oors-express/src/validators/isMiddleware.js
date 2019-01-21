import { validators as v, createComposedValidator } from 'easevalidation';

export default createComposedValidator(
  'isMiddlewareValidator',
  v.isEvery(
    v.isSchema({
      id: [v.isRequired(), v.isString()],
      path: [v.isDefault('/'), v.isString()],
      factory: v.isAny(v.isFunction(), v.isUndefined()),
      apply: v.isAny(v.isFunction(), v.isUndefined()),
      params: v.isDefault({}),
      enabled: [v.isDefault(true), v.isBoolean()],
    }),
    v.isValid(({ factory, apply, id }) => {
      if (!factory && !apply) {
        throw new Error(`One of "factory" or "apply" functions is required for ${id} middleware!`);
      }

      return true;
    }),
  ),
);
