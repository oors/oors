export default {
  type: 'object',
  properties: {
    userId: {
      isId: true,
    },
    ip: {
      type: 'string',
    },
    browser: {
      type: 'string',
    },
    os: {
      type: 'string',
    },
    platform: {
      type: 'string',
    },
  },
  required: ['userId', 'ip', 'browser', 'os', 'platform'],
};
