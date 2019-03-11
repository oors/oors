import { validators as v } from 'easevalidation';
import { Repository } from '../../../../../../packages/oors-mongodb';
import isObjectId from '../../../../../../packages/oors-mongodb/build/libs/isObjectId';

const statuses = ['DRAFT', 'PUBLISHED'];

class Post extends Repository {
  static statuses = statuses;

  static schema = {
    title: [v.isRequired(), v.isString()],
    slug: v.isAny(v.isUndefined(), v.isString()),
    status: [v.isDefault('DRAFT'), v.isString(), v.isOneOf(statuses)],
    excerpt: [v.isDefault(''), v.isString()],
    body: v.isAny(v.isUndefined(), v.isString()),
    tags: [v.isDefault([]), v.isArray(v.isString())],
    relatedPostIds: [v.isDefault([]), v.isArray(isObjectId())],
    categoryId: [v.isRequired(), isObjectId()],
    createdBy: [v.isRequired(), isObjectId()],
    updatedBy: v.isAny(v.isUndefined(), isObjectId()),
  };

  static relations = {
    category: {
      repositoryName: 'oors.blog.Category',
      localField: 'categoryId',
      foreignField: '_id',
      type: 'one',
    },
  };
}

export default Post;
