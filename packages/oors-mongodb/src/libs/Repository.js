import invariant from 'invariant';
import ValidationError from 'oors/build/errors/ValidationError';
import Store from './Store';
import AggregationPipeline from './AggregationPipeline';

class Repository extends Store {
  static getCollectionName() {
    return this.collectionName || this.name.substr(0, this.name.indexOf('Repository'));
  }

  constructor({ collection, schema, collectionName, relations = {} } = {}) {
    super(collection);

    this.schema = schema || this.constructor.schema;
    this.collectionName = collectionName || this.constructor.getCollectionName();
    this.relations = relations;
  }

  validate = () => true;

  // eslint-disable-next-line class-methods-use-this
  getRepository() {
    throw new Error('Not available! You need to bind the repository first.');
  }

  async parse(data) {
    if (!this.validate(data)) {
      throw new ValidationError(this.validate.errors);
    }

    return data;
  }

  hasRelation(name) {
    return Object.keys(this.relations).includes(name);
  }

  addRelation = (name, { repository, collectionName, type, localField, foreignField }) => {
    invariant(['one', 'many'].includes(type), 'type can only be one of: "one", "many"!');
    invariant(
      typeof localField === 'string',
      '"localField" is a required string - name of the local key!',
    );
    invariant(
      typeof foreignField === 'string',
      '"foreignField" is a required string - name of the foreign key!',
    );

    this.relations[name] = {
      repository,
      collectionName: collectionName || this.getRepository(repository).collectionName,
      type,
      localField,
      foreignField,
    };

    return this;
  };

  relationToLookup(name) {
    const { repository, collectionName, localField, foreignField, as } = this.relations[name];

    return {
      from: collectionName || this.getRepository(repository).collectionName,
      localField,
      foreignField,
      as: as || name,
    };
  }

  getFields = () => Object.keys(this.schema.properties);

  runBulkOperation = async ({ ordered = false } = {}, callback) => {
    const bulk = this.collection[`initialize${ordered ? 'Ordered' : 'Unordered'}BulkOp`]();
    await callback(bulk);
    return bulk.execute();
  };

  aggregate = (callback, options = {}) =>
    this.collection.aggregate(this.createPipeline(callback), options).toArray();

  createPipeline = callback => callback(new AggregationPipeline(this)).toArray();
}

export default Repository;
