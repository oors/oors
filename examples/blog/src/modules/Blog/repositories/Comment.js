import { validators as v } from 'easevalidation';
import { Repository } from '../../../../../../packages/oors-mongodb';
import isObjectId from '../../../../../../packages/oors-mongodb/build/libs/isObjectId';

class Comment extends Repository {
  static schema = {
    parentId: v.isAny(v.isUndefined(), isObjectId()),
    postId: [v.isRequired(), isObjectId()],
    body: [v.isRequired(), v.isString()],
    isHidden: [v.isDefault(false), v.isBoolean()],
    createdBy: [v.isRequired(), isObjectId()],
  };

  static collectionName = 'BlogComment';
}

export default Comment;
