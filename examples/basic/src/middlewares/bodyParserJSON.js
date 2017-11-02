import bodyParser from 'body-parser';

export default {
  id: 'bodyParserJSON',
  factory: (...args) => bodyParser.json(...args),
};
