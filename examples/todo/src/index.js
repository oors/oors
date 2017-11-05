/* eslint-disable no-console */
import Application from '../../../packages/oors-distributions/src/applications/Standard';
import './env';
import TodoModule from './modules/Todo';
import config from './config';

const app = new Application(config);

app.addModules(new TodoModule());

app.listen().catch(console.log.bind(console));
