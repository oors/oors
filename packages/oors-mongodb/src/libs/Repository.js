import Joi from 'joi';
import { CRUDServiceContainer } from 'octobus-crud';

class Repository extends CRUDServiceContainer {
  constructor(schema, collectionName) {
    super({
      _id: Joi.object(),
      ...schema,
    });

    if (!this.collectionName) {
      this.collectionName =
        collectionName ||
        this.constructor.name.substr(
          0,
          this.constructor.name.indexOf('Repository'),
        );
    }
  }
}

export default Repository;
