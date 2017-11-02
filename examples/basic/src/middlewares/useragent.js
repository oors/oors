import useragent from 'express-useragent';

export default {
  id: 'useragent',
  factory: () => useragent.express(),
};
