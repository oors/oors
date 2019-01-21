import cors from 'cors';

export default {
  id: 'cors',
  apply: ({ app }) => {
    app.use(cors);
    app.options('*', cors);
  },
};
