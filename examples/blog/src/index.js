/* eslint-disable no-console */
import Application from '../../../packages/oors-presets/src/applications/Standard';
import config from '../../../packages/oors-presets/build/config';
import BlogModule from './modules/Blog';

const app = new Application(config);

app.addModules(new BlogModule());

app.listen().catch(console.log.bind(console));
