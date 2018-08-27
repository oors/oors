import { Repository } from '../../../../../../packages/oors-mongodb';

class CategoryRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      createdBy: {
        isId: true,
      },
      updatedBy: {
        isId: true,
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
        this.relations.posts.repository.relationToLookup('category', {
          localField: 'posts.categoryId',
          as: 'posts.category',
        }),
      ));
  }
}

export default CategoryRepository;
