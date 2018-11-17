export default {
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    path: {
      type: 'string',
      default: '/',
    },
    factory: {
      instanceof: 'Function',
    },
    apply: {
      instanceof: 'Function',
    },
    params: {
      default: {},
    },
    enabled: {
      type: 'boolean',
      default: true,
    },
  },
  required: ['id'],
};
