import { validators as v } from 'easevalidation';
import withValidator from 'oors-graphql/build/decorators/withValidator';
import isObjectId from '../libs/isObjectId';

export default ({ maxPerPage = 20, defaultPerPage = 10 } = {}) =>
  withValidator(
    v.isSchema({
      skip: [v.isDefault(0), v.isMin(0), v.isInteger()],
      after: v.isAny(v.isUndefined(), isObjectId()),
      before: v.isAny(v.isUndefined(), isObjectId()),
      first: [v.isDefault(defaultPerPage), v.isMin(1), v.isMax(maxPerPage), v.isInteger()],
      last: v.isAny(v.isUndefined(), v.isEvery(v.isMin(1), v.isMax(maxPerPage), v.isInteger())),
      where: [v.isDefault({}), v.isRequired(), v.isObject()],
    }),
  );
