import { validators as v } from 'easevalidation';
import isObjectId from '../../../../../../packages/oors-mongodb/build/libs/isObjectId';
import { Repository } from '../../../../../../packages/oors-mongodb';

class Category extends Repository {
  static schema = {
    name: [v.isRequired(), v.isString()],
    createdBy: [v.isRequired(), isObjectId()],
    updatedBy: v.isAny(isObjectId(), v.isUndefined()),
  };

  static relations = {
    posts: {
      repositoryName: 'oors.blog.Post',
      localField: '_id',
      foreignField: 'categoryId',
      type: 'many',
    },
  };

  getAllWithPostsWithCategory() {
    return this.aggregate(pipeline => pipeline
      .lookup('posts')
      .unwind({ path: '$posts', preserveNullAndEmptyArrays: true })
      .lookup(
        this.getRepository('oors.blog.Post').relationToLookup('category', {
          localField: 'posts.categoryId',
          as: 'posts.category',
        }),
      ));
  }
}

export default Category;
