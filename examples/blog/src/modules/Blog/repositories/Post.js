import { Repository } from '../../../../../../packages/oors-mongodb';

const statuses = ['DRAFT', 'PUBLISHED'];

class PostRepository extends Repository {
  static statuses = statuses;

  static schema = {
    type: 'object',
    properties: {
      title: {
        type: 'string',
      },
      slug: {
        type: 'string',
      },
      status: {
        type: 'string',
        enum: statuses,
        default: 'DRAFT',
      },
      excerpt: {
        type: 'string',
        default: '',
      },
      body: {
        type: 'string',
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: [],
      },
      relatedPostIds: {
        type: 'array',
        items: {
          isObjectId: true,
        },
        default: [],
      },
      categoryId: {
        isObjectId: true,
      },
      createdBy: {
        isObjectId: true,
      },
      updatedBy: {
        isObjectId: true,
      },
    },
    required: ['title', 'createdBy', 'categoryId'],
  };

  static collectionName = 'BlogPost';
}

export default PostRepository;
