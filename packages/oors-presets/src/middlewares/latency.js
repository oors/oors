import random from 'lodash/random';

export default {
  id: 'latency',
  factory: ({ min, max }) => (req, res, next) => {
    setTimeout(next, random(min, max));
  },
  params: {
    min: 0,
    max: 1500,
  },
};
