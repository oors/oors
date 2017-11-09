/* eslint-disable no-console */
import './env';
import Application from '../../../packages/oors-distributions/src/applications/Standard';
import BlogModule from './modules/Blog';

const app = new Application();

app.addModules(new BlogModule());

app.listen().catch(console.log.bind(console));
