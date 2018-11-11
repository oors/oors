/* eslint-disable class-methods-use-this */
import set from 'lodash/set';
import has from 'lodash/has';
import { ObjectID as objectId } from 'mongodb';
import escapeRegexp from 'escape-string-regexp';

class QueryBuilder {
  constructor({ fieldResolvers = {}, relationFields = [] } = {}) {
    this.fieldResolvers = fieldResolvers;
    this.relationFields = relationFields;
    this.comparators = {};

    this.addComparator('not', (query, fieldName, value) => {
      set(query, `${fieldName}.$ne`, value);
    });

    this.addComparator('notIn', (query, fieldName, value) => {
      set(query, `${fieldName}.$nin`, value);
    });

    this.addComparator('in', (query, fieldName, value) => {
      set(query, `${fieldName}.$in`, value);
    });

    this.addComparator('lt', (query, fieldName, value) => {
      set(query, `${fieldName}.$lt`, value);
    });

    this.addComparator('lte', (query, fieldName, value) => {
      set(query, `${fieldName}.$lte`, value);
    });

    this.addComparator('gt', (query, fieldName, value) => {
      set(query, `${fieldName}.$gt`, value);
    });

    this.addComparator('gte', (query, fieldName, value) => {
      set(query, `${fieldName}.$gte`, value);
    });

    this.addComparator('between', (query, fieldName, value) => {
      const [min, max] = value;
      set(query, `${fieldName}.$gt`, min);
      set(query, `${fieldName}.$lt`, max);
    });

    this.addComparator('betweene', (query, fieldName, value) => {
      const [min, max] = value;
      set(query, `${fieldName}.$gte`, min);
      set(query, `${fieldName}.$lte`, max);
    });

    this.addComparator('notContains', (query, fieldName, value) => {
      set(query, `${fieldName}.$not.$regex`, `.*${escapeRegexp(value)}.*`);
      set(query, `${fieldName}.$not.$options`, 'i');
    });

    this.addComparator('contains', (query, fieldName, value) => {
      set(query, `${fieldName}.$regex`, `.*${escapeRegexp(value)}.*`);
      set(query, `${fieldName}.$options`, 'i');
    });

    this.addComparator('regex', (query, fieldName, value) => {
      set(query, `${fieldName}.$regex`, value);
      set(query, `${fieldName}.$options`, 'i');
    });

    this.addComparator('startsWith', (query, fieldName, value) => {
      set(query, `${fieldName}.$regex`, `^${escapeRegexp(value)}.*`);
      set(query, `${fieldName}.$options`, 'i');
    });

    this.addComparator('endsWith', (query, fieldName, value) => {
      set(query, `${fieldName}.$regex`, `.*${escapeRegexp(value)}$`);
      set(query, `${fieldName}.$options`, 'i');
    });
  }

  addComparator(name, resolver) {
    this.comparators[name] = {
      matcher: new RegExp(`^(.*)_(${name})$`),
      resolver,
    };
  }

  toField(field) {
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
    const comparator = Object.keys(this.comparators).find(name =>
      this.comparators[name].matcher.test(field),
    );

    if (!comparator) {
      set(query, this.toField(field), this.castValue(value, field));
    } else {
      const [, fieldName] = field.match(this.comparators[comparator].matcher);
      this.comparators[comparator].resolver(
        query,
        this.toField(fieldName),
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
}

export default QueryBuilder;
