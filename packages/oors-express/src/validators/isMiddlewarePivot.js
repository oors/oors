import { validators as v, createComposedValidator } from 'easevalidation';

export default createComposedValidator(
  'isMiddlewarePivot',
  v.isAny(
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
  ),
);
