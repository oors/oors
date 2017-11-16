import { Module } from 'oors/build/index';
import { createLoaders } from 'oors-mongodb/build/libs/graphql';
import withTimestamps from 'oors-mongodb/build/decorators/withTimestamps';
import PostRepositoryClass from './repositories/Post';
import CategoryRepositoryClass from './repositories/Category';
import CommentRepositoryClass from './repositories/Comment';

class BlogModule extends Module {
  name = 'oors.blog';

  async setup() {
    const [{ bindRepositories }, { addLoaders }] = await this.dependencies([
      'oors.mongoDb',
      'oors.graphQL',
    ]);

    const [PostRepository, CategoryRepository, CommentRepository] = bindRepositories([
      withTimestamps()(new PostRepositoryClass()),
      withTimestamps()(new CategoryRepositoryClass()),
      withTimestamps()(new CommentRepositoryClass()),
    ]);

    addLoaders(createLoaders(PostRepository), 'blog.posts');
    addLoaders(createLoaders(CategoryRepository), 'blog.categories');
    addLoaders(createLoaders(CommentRepository), 'blog.comments');

    this.export({
      PostRepository,
      CategoryRepository,
      CommentRepository,
    });
  }
}

export default BlogModule;
