import last from 'lodash/last';
import isEqual from 'lodash/isEqual';

class AggregationPipeline {
  static stages = [
    'addFields',
    'bucket',
    'bucketAuto',
    'collStats',
    'count',
    'currentOp',
    'facet',
    'geoNear',
    'graphLookup',
    'group',
    'indexStats',
    'limit',
    'listLocalSessions',
    'listSessions',
    'lookup',
    'match',
    'out',
    'project',
    'redact',
    'replaceRoot',
    'sample',
    'skip',
    'sort',
    'sortByCount',
    'unwind',
  ];

  constructor(repository, startPipeline = [], options = {}) {
    this.repository = repository;
    this.stack = [];
    this.options = options;

    this.merge(startPipeline);

    // check if using Proxy is a better alternative
    this.constructor.stages.forEach(stage => {
      if (!this[stage]) {
        this[stage] = value => this.push({ [`$${stage}`]: value });
      }
    });
  }

  setOptions(options) {
    if (typeof options === 'function') {
      this.options = options(this.options);
    } else {
      Object.assign(this.options, options);
    }

    return this;
  }

  unshift(...operations) {
    operations.reverse().forEach(operation => {
      this.stack.unshift(...(Array.isArray(operation) ? operation : [operation]));
    });

    return this;
  }

  push(...operations) {
    operations.forEach(operation => {
      this.stack.push(...(Array.isArray(operation) ? operation : [operation]));
    });

    return this;
  }

  merge(pipeline) {
    return this.push(Array.isArray(pipeline) ? pipeline : pipeline.stack);
  }

  match = query =>
    typeof query !== 'object' || !Object.keys(query).length ? this : this.push({ $match: query });

  project = fields =>
    this.push({
      $project: Array.isArray(fields)
        ? fields.reduce(
            (acc, field) => ({
              ...acc,
              ...(typeof field === 'string' ? { [field]: 1 } : field),
            }),
            {},
          )
        : fields,
    });

  lookup = (
    relation,
    { as = relation, match = false, projectOne = true, ignoreIfExists = false, ...rest } = {},
  ) => {
    if (typeof relation === 'object') {
      return this.push({
        $lookup: relation,
      });
    }

    if (!this.repository.hasRelation(relation)) {
      throw new Error(
        `Missing "${relation}" relation in the "${this.repository.constructor.name}" repository!`,
      );
    }

    const { type } = this.repository.getRelation(relation);

    if (ignoreIfExists && this.hasLookup(relation, { as, ...rest })) {
      return this;
    }

    this.push({
      $lookup: this.repository.relationToLookup(relation, { as, ...rest }),
    });

    if (match) {
      this.match({
        [as]: {
          $elemMatch: match,
        },
      });
    }

    if (type === 'one' && projectOne) {
      this.addFields({
        [as]: {
          $arrayElemAt: [`$${as}`, 0],
        },
      });
    }

    return this;
  };

  hasLookup = (relation, options = {}) =>
    !!this.stack.find(
      stage =>
        stage.$lookup &&
        isEqual(stage.$lookup, this.repository.relationToLookup(relation, options)),
    );

  sort = fields =>
    this.push({
      $sort: Object.keys(fields).reduce(
        (acc, field) => ({
          ...acc,
          [field]:
            fields[field] === 1 ||
            (typeof fields[field] === 'string' && fields[field].toLowerCase() === 'asc')
              ? 1
              : -1,
        }),
        {},
      ),
    });

  slice = (start, end) => this.push(this.skip(start), this.limit(end - start));

  count = (outputField = 'count') => this.push({ $count: outputField });

  one = () => this.limit(1);

  clone = pipeline => new this.constructor(this.repository, pipeline || [...this.stack]);

  toCursor = () =>
    this.repository.aggregate({
      pipeline: this.stack,
      options: this.options,
    });

  toArray = async () => (await this.toCursor()).toArray();

  toResult = async () => {
    const lastStage = last(this.stack);
    const result = await this.toArray();

    if (!lastStage) {
      return result;
    }

    if (lastStage.$count) {
      return result.length > 0 ? result[0][lastStage.$count] : 0;
    }

    if (lastStage.$limit && lastStage.$limit === 1) {
      return result.length > 0 ? result[0] : null;
    }

    return result;
  };

  watch = (options = {}) => this.repository.collection.watch(this.stack, options);

  watchChanges = (onChange, ...args) => {
    const changeStream = this.watch(...args);
    changeStream.on('change', onChange);
    return changeStream;
  };

  on = (operation, cb, options = {}) => {
    const operationType = operation === 'create' ? 'insert' : operation;
    const changeStream = this.match({
      operationType,
    }).watchChanges(change => cb(change.fullDocument, change), {
      fullDocument: 'updateLookup',
      ...options,
    });

    return () => changeStream.close();
  };
}

export default AggregationPipeline;
