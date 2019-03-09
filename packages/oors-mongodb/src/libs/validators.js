import intersection from 'lodash/intersection';
import { validators as v } from 'easevalidation';

export const isRelation = v.isEvery(
  v.isSchema({
    localField: [v.isRequired(), v.isString()],
    foreignField: [v.isRequired(), v.isString()],
    type: v.isOneOf(['one', 'many']),
    collectionName: v.isAny([v.isUndefined(), v.isString()]),
    repositoryName: v.isAny([v.isUndefined(), v.isString()]),
    repository: v.isAny([v.isUndefined(), v.isObject()]),
  }),
  v.isValid(
    relation =>
      intersection(Object.keys(relation), ['collectionName', 'repositoryName', 'repository'])
        .length === 1,
  ),
);
