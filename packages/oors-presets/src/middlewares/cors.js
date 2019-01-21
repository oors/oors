import cors from 'cors';

export default {
  id: 'cors',
  apply: ({ app, params }) => {
    app.use(cors(params));
    app.options('*', cors(params));
  },
};
