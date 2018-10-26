import identity from 'lodash/identity';
import get from 'lodash/get';
import ValidationError from 'oors/build/errors/ValidationError';
import Store from './Store';
import AggregationPipeline from './AggregationPipeline';

class Repository extends Store {
  static getCollectionName() {
    return this.collectionName || this.name.substr(0, this.name.indexOf('Repository'));
  }

  constructor({ collection, schema, collectionName } = {}) {
    super(collection);
    this.schema = schema || this.schema || this.constructor.schema;
    this.collectionName =
      collectionName || this.collectionName || this.constructor.getCollectionName();
  }

  // eslint-disable-next-line
  configure({ getRepository }) {}

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

  createPipeline = (initialPipeline = []) =>
    new AggregationPipeline(this, this.toMongoPipeline(initialPipeline));

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
