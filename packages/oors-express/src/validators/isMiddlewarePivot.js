import { validators as v, createValidator, validate } from 'easevalidation';

const isMiddlewarePivotValidator = v.isAny(
  v.isString(),
  v.isEvery(
    v.isSchema({
      before: v.isAny(v.isString(), v.isUndefined()),
      after: v.isAny(v.isString(), v.isUndefined()),
    }),
    v.isObject({
      length: 1,
      validator: v.isEvery(v.isRequired(), v.isString()),
    }),
  ),
);

export default createValidator('isMiddlewarePivot', value => ({
  isValid: true,
  value: validate(isMiddlewarePivotValidator)(value),
}));
