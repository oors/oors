/* eslint-disable no-console */
import path from 'path';
import Application from '../../../packages/oors-presets/build/applications/Standard';
import config from '../../../packages/oors-presets/build/config';
// import AJVModule from '../../../packages/oors-ajv/build/index';
import WebModule from '../../../packages/oors-web';
import BlogModule from './modules/Blog';

config.set('rootDir', path.resolve(__dirname, '..'));
config.set('modules.oors.mongodb.autoloadRepositories', true);
config.set(
  'modules.oors.web.nextMiddlewareConfig.params.appConfig.dir',
  path.resolve(config.get('rootDir'), 'web'),
);
config.set('modules.oors.user.mockUserConfig.enabled', true);

const app = new Application(config);

app.addModules(new BlogModule(), new WebModule());

app.listen().catch(console.log.bind(console));
