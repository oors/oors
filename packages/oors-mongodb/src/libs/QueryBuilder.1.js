/* eslint-disable */
import set from 'lodash/set';
import has from 'lodash/has';
import { ObjectID as objectId } from 'mongodb';
import escapeRegexp from 'escape-string-regexp';

class QueryBuilder {
  static createRegexMatcherFromStr = str => val =>
    new RegExp(`^(.*)_(${Array.isArray(str) ? str.join('|') : str})$`).test(val);

  constructor({ fieldResolvers = {}, relationFields = [] } = {}) {
    this.fieldResolvers = fieldResolvers;
    this.relationFields = relationFields;
    this.fieldMatchers = [];
    this.queryModifiers = [];

    const strToMatcher = this.constructor.createRegexMatcherFromStr;

    this.addFieldMatcher(strToMatcher('not'), (query, fieldName, value) => ({
      $ne: value,
    }));

    this.addFieldMatcher(strToMatcher('notIn'), (query, fieldName, value) => ({
      $nin: value,
    }));

    this.addFieldMatcher(strToMatcher('in'), (query, fieldName, value) => ({
      $in: value,
    }));

    this.addFieldMatcher(strToMatcher(['lt', 'lowerThan']), (query, fieldName, value) => ({
      $lt: value,
    }));

    this.addFieldMatcher(strToMatcher(['lte', 'lowerThanOrEqual']), (query, fieldName, value) => ({
      $lte: value,
    }));

    this.addFieldMatcher(strToMatcher(['gt', 'greaterThan']), (query, fieldName, value) => ({
      $gt: value,
    }));

    this.addFieldMatcher(
      strToMatcher(['gte', 'greaterThanOrEqual']),
      (query, fieldName, value) => ({
        $gte: value,
      }),
    );

    this.addFieldMatcher(strToMatcher('between'), (query, fieldName, value) => {
      const [min, max] = value;
      return {
        $gt: min,
        $lt: max,
      };
    });

    this.addFieldMatcher(
      strToMatcher(['betweene', 'betweenOrEqual']),
      (query, fieldName, value) => {
        const [min, max] = value;
        return {
          $gte: min,
          $lte: max,
        };
      },
    );

    this.addFieldMatcher(strToMatcher('notContains'), (query, fieldName, value) => ({
      $not: {
        $regex: `.*${escapeRegexp(value)}.*`,
        $options: 'i',
      },
    }));

    this.addFieldMatcher(strToMatcher('contains'), (query, fieldName, value) => ({
      $regex: `.*${escapeRegexp(value)}.*`,
      $options: 'i',
    }));

    this.addFieldMatcher(strToMatcher('regex'), (query, fieldName, value) => ({
      $regex: value,
      $options: 'i',
    }));

    this.addFieldMatcher(strToMatcher('startsWith'), (query, fieldName, value) => ({
      $regex: `^${escapeRegexp(value)}.*`,
      $options: 'i',
    }));

    this.addFieldMatcher(strToMatcher('endsWith'), (query, fieldName, value) => ({
      $regex: `.*${escapeRegexp(value)}$`,
      $options: 'i',
    }));
  }

  addFieldMatcher(test, resolver, extractFieldName) {
    this.fieldMatchers.push({
      test,
      resolver,
      extractFieldName,
    });
  }

  toFieldName(field) {
    if (field === 'id') {
      return '_id';
    }

    return field;
  }

  castValue(value, field) {
    if (field === 'id' || field === '_id') {
      return Array.isArray(value) ? value.map(objectId) : objectId(value);
    }

    return value;
  }

  applyField(query, field, value) {
    const matcher = this.fieldMatchers.find(({ test }) => !!test(field));

    if (!matcher) {
      set(query, this.toFieldName(field), this.castValue(value, field));
    } else {
      const [, fieldName] = field.match(matcher.test(field));
      this.comparators[comparator].resolver(
        query,
        this.toFieldName(fieldName),
        this.castValue(value, fieldName),
      );
    }
  }

  toMongoQuery(where) {
    const query = {};

    Object.keys(where).forEach(field => {
      const value = where[field];
      const resolver = this.fieldResolvers[field];

      if (resolver) {
        resolver(query, value, where, this);
        return;
      }

      if (this.relationFields.includes(field)) {
        query[field] = this.toMongoQuery(value);
        return;
      }

      if (['and', 'or', 'nor'].includes(field.toLowerCase())) {
        set(query, `$${field.toLowerCase()}`, value.map(subWhere => this.toMongoQuery(subWhere)));
        return;
      }

      this.applyField(query, field, value);
    });

    return query;
  }

  applyMatchers(where, pipeline) {
    Object.keys(where).forEach(field => {
      const value = where[field];
      const resolver = this.fieldResolvers[field];

      if (resolver) {
        resolver(pipeline, value, where, this);
        return;
      }

      if (['and', 'or', 'nor'].includes(field.toLowerCase())) {
        pipeline.match({
          [`$${field.toLowerCase()}`]: value.map(subWhere =>
            this.applyMatchers(subWhere, pipeline),
          ),
        });
        return;
      }

      if (this.relationFields.includes(field)) {
        pipeline.lookup(field, {
          match: this.applyMatchers(value, pipeline),
        });
        return;
      }

      this.applyField(query, field, value);
    });
  }

  applyPagination(query, { skip, after, first, last, pivot, orderBy }) {
    if (pivot) {
      if (!orderBy) {
        set(query, `query._id.${after ? '$gt' : '$lt'}`, pivot._id);
      } else {
        orderBy.forEach(({ field, order }) => {
          const comparators = after
            ? {
                asc: '$gt',
                desc: '$lt',
              }
            : {
                asc: '$lt',
                desc: '$gt',
              };

          if (has(pivot, field)) {
            set(query, `query.${field}.${comparators[order.toLowerCase()]}`, pivot[field]);
          }
        });
      }
    }

    if (first) {
      set(query, 'limit', parseInt(first, 10));
    }

    if (skip) {
      set(query, 'skip', parseInt(skip, 10));
    }

    if (last) {
      throw new Error('Operator "last" is not supported!');
      // set(query, 'skip', parseInt(skip, 10) + (total - last));
    }

    return query;
  }

  applySorting(query, { orderBy = [] }) {
    if (!orderBy.length) {
      return query;
    }

    if (!query.orderBy) {
      set(query, 'orderBy', {});
    }

    orderBy.forEach(({ field, order }) => {
      Object.assign(query.orderBy, {
        [field]: order,
      });
    });

    return query;
  }

  toQuery({ where = {}, ...restArgs }) {
    const query = {
      query: this.toMongoQuery(where),
    };

    this.applyPagination(query, restArgs);
    this.applySorting(query, restArgs);

    return query;
  }

  toPipeline({ where = {}, skip, after, first, last, pivot, orderBy }, pipeline) {}
}

export default QueryBuilder;
