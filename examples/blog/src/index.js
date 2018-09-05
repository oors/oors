/* eslint-disable no-console */
import Application from '../../../packages/oors-presets/src/applications/Standard';
import config from '../../../packages/oors-presets/build/config';
import BlogModule from './modules/Blog';
import RADModule from '../../../packages/oors-rad/src/index';

config.add({
  'modules.oors.rad.autoloadServices': false,
});

const app = new Application(config);

app.addModules(new BlogModule());
app.addModules(new RADModule());

app.listen().catch(console.log.bind(console));
