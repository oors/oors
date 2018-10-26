import last from 'lodash/last';
import isEmpty from 'lodash/isEmpty';

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

  constructor(repository, pipeline = []) {
    this.repository = repository;
    this.pipeline = pipeline;
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

  merge(pipeline) {
    return this.push(pipeline.toArray());
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

  lookup = (relation, { as = relation, match = false, projectOne = true } = {}) => {
    if (typeof relation === 'object') {
      return this.push({
        $lookup: relation,
      });
    }

    const { type } = this.repository.getRelation(relation);

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

    if (type === 'one' && projectOne) {
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

  toArray = () => {
    if (this.pipeline.length <= 1) {
      return this.pipeline;
    }

    // merge successive $match calls
    return this.pipeline.reduce((pipeline, next, index) => {
      // ignore empty $match calls
      if (next.$match && isEmpty(next.$match)) {
        return pipeline;
      }

      if (index === 0) {
        return [{ ...next }];
      }

      const current = last(pipeline);

      if (current.$match && next.$match) {
        current.$match = {
          $and: [
            ...(Array.isArray(current.$match.$and) ? current.$match.$and : [current.$match]),
            next.$match,
          ],
        };
      } else {
        pipeline.push({ ...next });
      }

      return pipeline;
    }, []);
  };

  toJSON = () => this.toArray();

  toResult = async () => {
    const pipeline = this.toArray();
    const lastStage = last(pipeline);
    const result = await this.repository.aggregate(pipeline);

    if (!pipeline.length) {
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
}

export default AggregationPipeline;
