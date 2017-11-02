import cookieParser from 'cookie-parser';

export default {
  id: 'cookieParser',
  factory: ({ secret, options = {} }) => cookieParser(secret, options),
};
