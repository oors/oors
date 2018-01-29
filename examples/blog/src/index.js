/* eslint-disable no-console */
import config from '../../../packages/oors-presets/build/config';
// import Application from 'oors-presets/build/applications/Standard';
import Application from '../../../packages/oors-presets/build/applications/Standard';
import BlogModule from './modules/Blog';

config.set(
  'modules.oors.graphQL.graphiql.params.query',
  `
{
  blogPosts {
    id
    title
    category {
      id
      name
    }
    comments {
      body
    }
  }
}`,
);

const app = new Application(config);

app.addModules(new BlogModule());

app.listen().catch(console.log.bind(console));
