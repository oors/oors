/**
this.aggregate(pipeline =>
  pipeline
    .match({
      age: {
        $gt: 2,
      },
    })
    .lookup('project')
    .lookup('tags')
    .slice(0, 10),
);
*/
import set from 'lodash/set';

class AggregationPipeline {
  constructor(repository) {
    this.repository = repository;
    this.pipeline = [];
  }

  push(...operations) {
    operations.forEach(operation => {
      if (Array.isArray(operation)) {
        this.pipeline.push(...operation);
      } else {
        this.pipeline.push(operation);
      }
    });

    return this;
  }

  match = query =>
    this.push({
      $match: query,
    });

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
    const {
      repository,
      collectionName,
      localField,
      foreignField,
      type,
    } = this.repository.relations[relation];

    this.push({
      $lookup: {
        from: collectionName || this.repository.getRepository(repository).collectionName,
        localField,
        foreignField,
        as,
      },
    });

    if (match) {
      this.match({
        [as]: {
          $elemMatch: match,
        },
      });
    }

    if (project && type === 'one') {
      const fields = {};

      set(fields, `${as}.$arrayElemAt`, [`$${as}`, 0]);

      // project its own fields
      this.repository.getFields().forEach(propr => {
        set(fields, propr, `$${propr}`);
      });

      this.project(fields);
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

  skip = value =>
    this.push({
      $skip: value,
    });

  limit = value =>
    this.push({
      $limit: value,
    });

  count = (outputField = 'count') => this.push({ $count: outputField });

  toArray = () => this.pipeline;
}

export default AggregationPipeline;
