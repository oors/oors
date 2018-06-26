import set from 'lodash/set';
import isEmpty from 'lodash/isEmpty';
import flatten from 'lodash/flatten';
import MongoRepository from './Repository';
import { queryToPipeline } from './libs/helpers';

class RelationalRepository extends MongoRepository {
  constructor({ relations = {}, ...restArgs } = {}) {
    super(restArgs);

    this.relations = relations;
  }

  hasRelation(name) {
    return Object.keys(this.relations).includes(name);
  }

  relationToLookup(name) {
    const { repository, collectionName, localField, foreignField, as } = this.relations[name];

    return {
      from: collectionName || this.getRepository(repository).collectionName,
      localField,
      foreignField,
      as: as || name,
    };
  }

  async findOneOrCreate(data) {
    let item = await this.findOne({
      query: data,
    });

    if (!item) {
      item = await this.createOne(data);
    }

    return item;
  }

  async count(args) {
    const containsLookups = this.getReferencedRelations(args.query || {}).length;

    if (containsLookups) {
      const count = await this.aggregate({
        pipeline: [
          ...this.toPipelineArray(args),
          {
            $count: 'total',
          },
        ],
      }).then(c => c.toArray());

      return count.length ? count[0].total : 0;
    }

    return MongoRepository.prototype.count.call(this, args);
  }

  async findOne(args) {
    const containsLookups = this.getReferencedRelations(args.query || {}).length;
    if (containsLookups) {
      const list = await this.aggregate({
        pipeline: this.toPipelineArray(args),
      }).then(c => c.toArray());

      return list.length ? list[0] : null;
    }

    return MongoRepository.prototype.findOne.call(this, args);
  }

  findMany(args) {
    const containsLookups = this.getReferencedRelations(args.query || {}).length;
    if (containsLookups) {
      return this.aggregate({
        pipeline: this.toPipelineArray(args),
      });
    }

    return MongoRepository.prototype.findMany.call(this, args);
  }

  getReferencedRelations(query) {
    return Object.keys(query).reduce((acc, field) => {
      if (['$and', '$or', '$nor'].includes(field.toLowerCase())) {
        return [
          ...acc,
          ...flatten(query[field].map(subQuery => this.getReferencedRelations(subQuery))),
        ];
      }

      if (this.hasRelation(field) && !acc.includes(field)) {
        return [...acc, field];
      }

      return acc;
    }, []);
  }

  buildLookups(query) {
    const pipeline = [];
    const relations = this.getReferencedRelations(query);

    relations.forEach(key => {
      pipeline.push({
        $lookup: this.relationToLookup(key),
      });
    });

    return pipeline;
  }

  buildMatchers(query) {
    return Object.keys(query).reduce((acc, field) => {
      if (['$and', '$or', '$nor'].includes(field.toLowerCase())) {
        return {
          ...acc,
          [field]: query[field].map(subQuery => this.buildMatchers(subQuery)),
        };
      }

      if (this.hasRelation(field)) {
        if (typeof query[field] === 'boolean' && query[field]) {
          return acc;
        }

        return {
          ...acc,
          [field]: {
            $elemMatch: query[field],
          },
        };
      }

      return {
        ...acc,
        [field]: query[field],
      };
    }, {});
  }

  buildProjections(query) {
    const projections = {};
    const relations = this.getReferencedRelations(query);

    if (!relations.length) {
      return null;
    }

    // project looked-up type "one" relations
    relations.forEach(relationName => {
      if (this.relations[relationName].type === 'one') {
        set(projections, `${this.relationToLookup(relationName).as}.$arrayElemAt`, [
          `$${this.relationToLookup(relationName).as}`,
          0,
        ]);
      } else {
        set(
          projections,
          `${this.relationToLookup(relationName).as}`,
          `$${this.relationToLookup(relationName).as}`,
        );
      }
    });

    // project its own fields
    Object.keys(this.schema.properties).forEach(propr => {
      set(projections, propr, `$${propr}`);
    });

    return projections;
  }

  toPipelineArray({ query = {}, ...restArgs }) {
    const pipeline = [];

    pipeline.push(...this.buildLookups(query));

    const match = this.buildMatchers(query);

    if (!isEmpty(match)) {
      pipeline.push({
        $match: match,
      });
    }

    const projections = this.buildProjections(query);

    if (projections) {
      pipeline.push({
        $project: projections,
      });
    }

    pipeline.push(...queryToPipeline(restArgs)); // orderBy, skip, limit

    return pipeline;
  }
}

export default RelationalRepository;
