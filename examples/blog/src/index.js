/* eslint-disable no-console */
import Application from '../../../packages/oors-distributions/src/applications/Standard';
import './env';
import BlogModule from './modules/Blog';
import config from './config';

const app = new Application(config);

app.addModules(new BlogModule());

app.listen().catch(console.log.bind(console));
