/* eslint-disable no-console */
import random from 'lodash/random';
import config from '../../../packages/oors-presets/build/config';
import Application from '../../../packages/oors-presets/build/applications/Standard';
import BlogModule from '../src/modules/Blog';

config.set('modules.oors.logger.printModules', false);
config.set('modules.oors.logger.printDependencyGraph', false);
config.set('modules.oors.logger.printMiddlewares', false);
config.set('modules.oors.mongodb.autoloadRepositories', true);

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

const createUsers = async ({ signup, AccountRepository }) =>
  Promise.all(
    data.users.map(async userEntry => {
      const user = await signup(userEntry);
      await AccountRepository.confirm(user.account.confirmation.token);
      return user;
    }),
  );

const createBlogCategories = async ({ CategoryRepository, users }) =>
  Promise.all(
    data.blog.categories.map(name =>
      CategoryRepository.createOne({
        name,
        createdBy: users[random(users.length - 1)]._id,
      })),
  );

const createBlogPosts = async ({ PostRepository, categories, users }) =>
  Promise.all(
    data.blog.posts.map(({ category, ...postData }) =>
      PostRepository.createOne({
        ...postData,
        createdBy: users[random(users.length - 1)]._id,
        categoryId: categories.find(({ name }) => name === category)._id,
      })),
  );

const createBlogComments = async ({ CommentRepository, posts, users }) =>
  Promise.all(
    data.blog.comments.map(({ post, ...commentData }) =>
      CommentRepository.createOne({
        ...commentData,
        createdBy: users[random(users.length - 1)]._id,
        postId: posts.find(({ title }) => title === post)._id,
      })),
  );

app
  .boot()
  .then(async () => {
    const { getRepository } = app.modules.get('oors.mongodb');
    const PostRepository = getRepository('oors.blog.Post');
    const CategoryRepository = getRepository('oors.blog.Category');
    const CommentRepository = getRepository('oors.blog.Comment');
    const AccountRepository = getRepository('oors.user.Account');
    const { signup } = app.modules.get('oors.user');

    const users = await createUsers({ signup, AccountRepository });
    const categories = await createBlogCategories({ CategoryRepository, users });
    const posts = await createBlogPosts({ PostRepository, categories, users });
    await createBlogComments({ CommentRepository, posts, users });

    return app.shutdown();
  })
  .then(() => {
    console.log('Done!');
  });
