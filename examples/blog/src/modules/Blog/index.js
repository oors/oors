import { createLoaders } from '../../../../../packages/oors-mongodb/build/libs/graphql';
import withTimestamps from '../../../../../packages/oors-mongodb/build/decorators/withTimestamps';
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

    const Post = addRepository('blogPost', withTimestamps()(new PostRepository()));
    const Category = addRepository('blogCategory', withTimestamps()(new CategoryRepository()));
    const Comment = addRepository('blogComment', withTimestamps()(new CommentRepository()));

    addLoaders(createLoaders(Post), 'blog.posts');
    addLoaders(createLoaders(Category), 'blog.categories');
    addLoaders(createLoaders(Comment), 'blog.comments');
  }
}

export default BlogModule;
