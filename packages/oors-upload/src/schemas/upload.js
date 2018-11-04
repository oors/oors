export default {
  type: 'object',
  properties: {
    originalname: {
      type: 'string',
    },
    path: {
      type: 'string',
    },
    size: {
      type: 'number',
    },
    mimetype: {
      type: 'string',
    },
    destination: {
      type: 'string',
    },
  },
  required: ['originalname', 'path', 'size', 'mimetype'],
};
