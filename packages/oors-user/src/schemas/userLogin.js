export default {
  type: 'object',
  properties: {
    userId: {
      isObjectId: true,
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
