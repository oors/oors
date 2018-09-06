import { Module } from '../../../../../packages/oors';
import PostRepository from './repositories/Post';
import CategoryRepository from './repositories/Category';
import CommentRepository from './repositories/Comment';

class BlogModule extends Module {
  name = 'oors.blog';

  async setup() {
    const [{ addRepository }] = await this.dependencies([
      'oors.mongodb',
      'oors.graphql',
      'oors.rad',
    ]);

    const Post = addRepository('blogPost', new PostRepository());
    const Category = addRepository('blogCategory', new CategoryRepository());
    addRepository('blogComment', new CommentRepository());

    Post.addRelation('category', {
      repository: Category,
      type: 'one',
      localField: 'categoryId',
      foreignField: '_id',
    });

    Category.addRelation('posts', {
      repository: Post,
      type: 'many',
      localField: '_id',
      foreignField: 'categoryId',
    });
  }
}

export default BlogModule;
