import identity from 'lodash/identity';
import get from 'lodash/get';
import ValidationError from 'oors/build/errors/ValidationError';
import Store from './Store';
import AggregationPipeline from './AggregationPipeline';

class Repository extends Store {
  static getCollectionName() {
    return this.collectionName || this.name.replace(/Repository$/, '');
  }

  constructor({ collection, collectionName, schema, relations } = {}) {
    super(collection);
    this.collectionName =
      (collection && collection.collectionName) ||
      collectionName ||
      this.collectionName ||
      this.constructor.getCollectionName();
    this.schema = schema || this.schema || this.constructor.schema;
    this.relations = relations || this.relations || this.constructor.relations || {};
  }

  // eslint-disable-next-line
  configure({ getRepository }) {}

  // eslint-disable-next-line class-methods-use-this
  getRepository() {
    throw new Error('Not available! You need to bind the repository first.');
  }

  validate(data) {
    if (this.validateBySchema) {
      return this.validateBySchema(data);
    }

    return true;
  }

  updateSchema(update) {
    this.schema = update(this.schema);
    this.validateBySchema = this.ajv.compile(this.schema);
  }

  async parse(data) {
    if (!this.validate(data)) {
      throw new ValidationError(this.validate.errors || [this.validate.error]);
    }

    return data;
  }

  getFields = () => Object.keys(this.schema.properties);

  runBulkOperation = async (callback, { ordered = false } = {}) => {
    const bulk = this.collection[`initialize${ordered ? 'Ordered' : 'Unordered'}BulkOp`]();
    await callback(bulk);
    const hasOperations = get(bulk, 's.currentBatch.operations', []).length > 0;
    return hasOperations ? bulk.execute() : false;
  };

  toMongoPipeline = pipeline => {
    if (typeof pipeline === 'function') {
      return this.toMongoPipeline(pipeline(this.createPipeline()));
    }

    if (pipeline instanceof AggregationPipeline) {
      return pipeline.toArray();
    }

    if (!Array.isArray(pipeline)) {
      throw new Error('Invalid pipeline argument!');
    }

    return pipeline;
  };

  aggregate = (pipeline, options = {}) =>
    this.collection.aggregate(this.toMongoPipeline(pipeline), options).toArray();

  createPipeline = (initialPipeline = [], options) =>
    new AggregationPipeline(this, this.toMongoPipeline(initialPipeline), options);

  watchChanges = (onChange, ...args) => {
    const changeStream = this.watch(...args);
    changeStream.on('change', onChange);
    return changeStream;
  };

  watch = (pipelineBuilder, options = {}) =>
    this.collection.watch(pipelineBuilder(this.createPipeline()).toArray(), options);

  on = (operation, cb, pipelineBuilder = identity, options = {}) => {
    const operationType = operation === 'create' ? 'insert' : operation;
    const changeStream = this.watchChanges(
      change => cb(change.fullDocument, change),
      p =>
        pipelineBuilder(
          p.match({
            operationType,
          }),
        ),
      {
        fullDocument: 'updateLookup',
        ...options,
      },
    );

    return () => changeStream.close();
  };
}

export default Repository;
