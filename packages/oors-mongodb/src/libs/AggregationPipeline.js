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

  constructor(repository) {
    this.repository = repository;
    this.pipeline = [];
    // check if using Proxy is a better alternative
    this.constructor.stages.forEach(stage => {
      if (!this[stage]) {
        this[stage] = value => this.push({ [`$${stage}`]: value });
      }
    });
  }

  unshift(...operations) {
    operations.reverse().forEach(operation => {
      this.pipeline.unshift(...(Array.isArray(operation) ? operation : [operation]));
    });

    return this;
  }

  push(...operations) {
    operations.forEach(operation => {
      this.pipeline.push(...(Array.isArray(operation) ? operation : [operation]));
    });

    return this;
  }

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

  lookup = (relation, { as = relation, project = true, match = false } = {}) => {
    if (typeof relation === 'object') {
      return this.push({
        $lookup: relation,
      });
    }

    const { type } = this.repository.relations[relation];

    this.push({
      $lookup: this.repository.relationToLookup(relation, { as }),
    });

    if (match) {
      this.match({
        [as]: {
          $elemMatch: match,
        },
      });
    }

    if (project && type === 'one') {
      this.addFields({
        [as]: {
          $arrayElemAt: [`$${as}`, 0],
        },
      });
    }

    return this;
  };

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

  toArray = () => this.pipeline;

  toJSON = () => this.toArray();
}

export default AggregationPipeline;
