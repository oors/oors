import { Repository } from '../../../../../../packages/oors-mongodb';

class CommentRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      parentId: {
        isObjectId: true,
      },
      postId: {
        isObjectId: true,
      },
      body: {
        type: 'string',
      },
      isHidden: {
        type: 'boolean',
        default: false,
      },
      createdBy: {
        isObjectId: true,
      },
    },
    required: ['postId', 'body', 'createdBy'],
  };

  static collectionName = 'BlogComment';
}

export default CommentRepository;
