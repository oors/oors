export default {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    isActive: {
      type: 'boolean',
      default: true,
    },
    isDeleted: {
      type: 'boolean',
    },
    isConfirmed: {
      type: 'boolean',
      default: false,
    },
    deletedAt: {
      instanceof: 'Date',
    },
  },
};
