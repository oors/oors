import { Module } from '../../../../../packages/oors';
import PostRepository from './repositories/Post';
import CategoryRepository from './repositories/Category';
import CommentRepository from './repositories/Comment';

class BlogModule extends Module {
  name = 'oors.blog';

  doNothingMessage = 'do nothing!';

  async setup() {
    const [{ addRepository, configureRelations }] = await this.dependencies([
      'oors.mongodb',
      'oors.graphql',
      'oors.rad',
    ]);

    const Post = addRepository('blogPost', new PostRepository());
    const Category = addRepository('blogCategory', new CategoryRepository());
    addRepository('blogComment', new CommentRepository());

    configureRelations(({ add }) => {
      add({
        from: {
          repository: Post,
          field: 'categoryId',
          name: 'category',
        },
        to: {
          repository: Category,
          field: '_id',
          name: 'posts',
        },
        type: 'one',
        inversedType: 'many',
      });
    });
  }
}

export default BlogModule;
