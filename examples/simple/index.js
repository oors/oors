import Application from '../../packages/oors-presets/src/applications/Standard';

const app = new Application();

app.get('/', (req, res) => {
  res.send('Hello from oors!');
});

app.listen().catch(console.log.bind(console));
