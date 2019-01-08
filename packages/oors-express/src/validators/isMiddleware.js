import { validators as v, createValidator, validate } from 'easevalidation';

const isMiddlewareValidator = v.isSchema({
  id: v.isString(),
  path: [v.isDefault('/'), v.isString()],
  factory: v.isFunction(),
  apply: v.isAny(v.isFunction(), v.isUndefined()),
  params: v.isDefault({}),
  enabled: [v.isDefault(true), v.isBoolean()],
});

export default createValidator('isMiddlewareValidator', value => ({
  isValid: true,
  value: validate(isMiddlewareValidator)(value),
}));
