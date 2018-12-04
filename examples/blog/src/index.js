/* eslint-disable no-console */
import Application from '../../../packages/oors-presets/build/applications/Standard';
import config from '../../../packages/oors-presets/build/config';
// import AJVModule from '../../../packages/oors-ajv/build/index';
import BlogModule from './modules/Blog';

config.set('modules.oors.mongodb.autoloadRepositories', true);

const app = new Application(config);

app.addModules(new BlogModule());

app.listen().catch(console.log.bind(console));
