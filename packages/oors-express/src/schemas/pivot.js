export default {
  oneOf: [
    { type: 'string' },
    {
      type: 'object',
      properties: {
        before: {
          type: 'string',
        },
        after: {
          type: 'string',
        },
      },
      additionalProperties: false,
      maxProperties: 1,
    },
  ],
};
