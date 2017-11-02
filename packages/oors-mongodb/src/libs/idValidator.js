import { ObjectID as objectId } from 'mongodb';

export default {
  modifying: true,
  errors: false,
  metaSchema: {
    type: 'boolean',
  },
  compile(schema) {
    return (id, path, parent, propr) => {
      if (!schema) {
        return true;
      }

      if (!objectId.isValid(id)) {
        return false;
      }

      Object.assign(parent, {
        [propr]: objectId(id),
      });

      return true;
    };
  },
};
