import { createLoaders } from '../../../../../packages/oors-mongodb/build/libs/graphql';
import { Module } from '../../../../../packages/oors';
import PostRepository from './repositories/Post';
import CategoryRepository from './repositories/Category';
import CommentRepository from './repositories/Comment';

class BlogModule extends Module {
  name = 'oors.blog';

  async setup() {
    const [{ addRepository }, { addLoaders }] = await this.dependencies([
      'oors.mongoDb',
      'oors.graphQL',
    ]);

    const Post = addRepository(
      'blogPost',
      new PostRepository({
        relations: {
          category: {
            repository: 'blogCategory',
            type: 'one',
            localField: 'categoryId',
            foreignField: '_id',
          },
        },
      }),
    );

    const Category = addRepository(
      'blogCategory',
      new CategoryRepository({
        relations: {
          posts: {
            repository: 'blogPost',
            type: 'many',
            localField: '_id',
            foreignField: 'categoryId',
          },
        },
      }),
    );
    const Comment = addRepository('blogComment', new CommentRepository());

    addLoaders(createLoaders(Post), 'blog.posts');
    addLoaders(createLoaders(Category), 'blog.categories');
    addLoaders(createLoaders(Comment), 'blog.comments');
  }
}

export default BlogModule;
