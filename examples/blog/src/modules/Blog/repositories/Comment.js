import Repository from '../../../../../../packages/oors-mongodb/build/Repository';

class CommentRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      parentId: {
        isId: true,
      },
      postId: {
        isId: true,
      },
      body: {
        type: 'string',
      },
      isHidden: {
        type: 'boolean',
        default: false,
      },
      createdBy: {
        isId: true,
      },
    },
    required: ['postId', 'body', 'createdBy'],
  };

  static collectionName = 'BlogComment';
}

export default CommentRepository;
