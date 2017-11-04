/* eslint-disable no-console */
import Application from '../../../packages/oors-distributions/src/applications/Standard';
import './env';
import CoreModule from './modules/Core';
import config from './config';

const app = new Application(config);

app.addModules(new CoreModule());

app.listen().catch(console.log.bind(console));
