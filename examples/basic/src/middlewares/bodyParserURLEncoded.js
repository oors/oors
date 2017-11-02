import bodyParser from 'body-parser';

export default {
  id: 'bodyParserURLEncoded',
  factory: (...args) => bodyParser.urlencoded(...args),
  params: { extended: true },
};
