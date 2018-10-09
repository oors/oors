import { Repository } from '../../../../../../packages/oors-mongodb';

class CategoryRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      createdBy: {
        isObjectId: true,
      },
      updatedBy: {
        isObjectId: true,
      },
    },
    required: ['name', 'createdBy'],
  };

  static collectionName = 'BlogCategory';

  getAllWithPostsWithCategory() {
    return this.aggregate(pipeline => pipeline
      .lookup('posts')
      .unwind({ path: '$posts', preserveNullAndEmptyArrays: true })
      .lookup(
        this.getRepository('blogPost').relationToLookup('category', {
          localField: 'posts.categoryId',
          as: 'posts.category',
        }),
      ));
  }
}

export default CategoryRepository;
