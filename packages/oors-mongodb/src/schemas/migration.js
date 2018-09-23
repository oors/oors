export default {
  type: 'object',
  properties: {
    timestamp: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    duration: {
      type: 'integer',
    },
  },
  required: ['timestamp'],
};
