/* eslint-disable no-console */
import './env';
import Application from '../../../packages/oors-presets/src/applications/Standard';
import TodoModule from './modules/Todo';

const app = new Application();

app.addModules(new TodoModule());

app.listen().catch(console.log.bind(console));
