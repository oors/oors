import { createValidator } from 'easevalidation';
import { ObjectID } from 'mongodb';

export default createValidator(
  'isObjectId',
  value => ObjectID.isValid(value),
  value => ObjectID(value),
);
