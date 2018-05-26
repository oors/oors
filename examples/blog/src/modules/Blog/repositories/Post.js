import Repository from '../../../../../../packages/oors-mongodb/build/Repository';

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
          isId: true,
        },
      },
      categoryId: {
        isId: true,
      },
      createdBy: {
        isId: true,
      },
      updatedBy: {
        isId: true,
      },
    },
    required: ['title', 'createdBy', 'categoryId'],
  };

  static collectionName = 'BlogPost';
}

export default PostRepository;
