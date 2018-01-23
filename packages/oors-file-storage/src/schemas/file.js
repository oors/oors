export default {
  type: 'object',
  properties: {
    filename: {
      type: 'string',
    },
    mimeType: {
      type: 'string',
    },
    extension: {
      type: 'string',
    },
    size: {
      type: 'number',
    },
    uploadedAt: {
      instanceof: 'Date',
    },
    meta: {
      type: 'object',
      default: {},
    },
  },
  required: ['filename', 'mimeType', 'extension', 'size'],
};
