/* eslint-disable no-console */
import random from 'lodash/random';
import config from '../../../packages/oors-presets/src/config';
import Application from '../../../packages/oors-presets/src/applications/Standard';
import BlogModule from '../src/modules/Blog';

config.set('modules.oors.logger.printModules', false);
config.set('modules.oors.logger.printDependencyGraph', false);
config.set('modules.oors.logger.printMiddlewares', false);

const app = new Application(config);

app.addModules(new BlogModule());

const data = {
  users: [
    {
      username: 'admin',
      name: 'OORS Admin',
      email: 'admin@example.com',
      password: 'admin',
    },
  ],
  blog: {
    categories: ['First Category', 'Second Category', 'Third Category'],
    posts: [
      {
        title: 'First Blog Post',
        slug: 'first-blog-post',
        category: 'First Category',
        body: 'Hello, world!',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    comments: [
      {
        body: 'First Comment',
        post: 'First Blog Post',
      },
      {
        body: 'Second Comment',
        post: 'First Blog Post',
      },
      {
        body: 'Third Comment',
        post: 'First Blog Post',
      },
    ],
  },
};

const createUsers = async ({ User, Account }) =>
  Promise.all(
    data.users.map(async userEntry => {
      const { user, account } = await User.signup(userEntry);
      await Account.confirm(account._id);
      return user;
    }),
  );

const createBlogCategories = async ({ CategoryRepository, users }) =>
  Promise.all(
    data.blog.categories.map(name =>
      CategoryRepository.createOne({ name, createdBy: users[random(users.length - 1)]._id }),
    ),
  );

const createBlogPosts = async ({ PostRepository, categories, users }) =>
  Promise.all(
    data.blog.posts.map(({ category, ...postData }) =>
      PostRepository.createOne({
        ...postData,
        createdBy: users[random(users.length - 1)]._id,
        categoryId: categories.find(({ name }) => name === category)._id,
      }),
    ),
  );

const createBlogComments = async ({ CommentRepository, posts, users }) =>
  Promise.all(
    data.blog.comments.map(({ post, ...commentData }) =>
      CommentRepository.createOne({
        ...commentData,
        createdBy: users[random(users.length - 1)]._id,
        postId: posts.find(({ title }) => title === post)._id,
      }),
    ),
  );

app
  .boot()
  .then(async () => {
    const { closeConnection, getRepository } = app.modules.get('oors.mongoDb');
    const PostRepository = getRepository('blogPost');
    const CategoryRepository = getRepository('blogCategory');
    const CommentRepository = getRepository('blogComment');
    const { User, Account } = app.modules.get('oors.user');

    const users = await createUsers({ User, Account });
    const categories = await createBlogCategories({ CategoryRepository, users });
    const posts = await createBlogPosts({ PostRepository, categories, users });
    await createBlogComments({ CommentRepository, posts, users });

    return closeConnection();
  })
  .then(() => {
    console.log('Done!');
  });
