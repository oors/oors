import has from 'lodash/has';
import get from 'lodash/get';
import escapeRegexp from 'escape-string-regexp';

class GQLQueryParser {
  static NODE_TYPES = {
    FIELD: Symbol('field'),
    RELATION: Symbol('relation'),
    LOGICAL_QUERY: Symbol('nestedQuery'),
  };

  constructor(module) {
    this.module = module;
    this.operators = {};

    this.configureOperators();
  }

  configureOperators() {
    this.addOperator('not', value => ({ $ne: value }));
    this.addOperator('in', value => ({ $in: value }));
    this.addOperator('notIn', value => ({ $nin: value }));
    this.addOperator(['lt', 'lowerThan'], value => ({ $lt: value }));
    this.addOperator(['lte', 'lowerThanOrEqual'], value => ({ $lte: value }));
    this.addOperator(['gt', 'greaterThan'], value => ({ $gt: value }));
    this.addOperator(['gte', 'greaterThanOrEqual'], value => ({ $gte: value }));
    this.addOperator('between', value => ({ $gt: value[0], $lt: value[1] }));
    this.addOperator(['betweene', 'betweenOrEqual'], value => ({ $gte: value[0], $lte: value[1] }));
    this.addOperator('contains', value => ({
      $regex: `.*${escapeRegexp(value)}.*`,
      $options: 'i',
    }));
    this.addOperator('notContains', value => ({
      $not: {
        $regex: `.*${escapeRegexp(value)}.*`,
        $options: 'i',
      },
    }));
    this.addOperator('regex', value => ({
      $regex: value,
      $options: 'i',
    }));
    this.addOperator('startsWith', value => ({
      $regex: `^${escapeRegexp(value)}.*`,
      $options: 'i',
    }));
    this.addOperator('endsWith', value => ({
      $regex: `.*${escapeRegexp(value)}$`,
      $options: 'i',
    }));
  }

  get relations() {
    return this.module.relations;
  }

  addOperator(nameOrNames, transfomer) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    names.forEach(name => {
      this.operators[name] = transfomer;
    });
  }

  parseQuery(query, collectionName) {
    return Object.keys(query).reduce((acc, field) => {
      const value = query[field];
      const node = {
        collectionName,
        field,
        value,
        operator: null,
        children: null,
      };

      acc.push(node);

      if (['and', 'or', 'nor'].includes(field.toLowerCase())) {
        node.type = this.constructor.NODE_TYPES.LOGICAL_QUERY;
        node.children = value.map(subQuery => this.parseQuery(subQuery, collectionName));
        return acc;
      }

      if (Object.keys(this.relations[collectionName]).includes(field)) {
        node.type = this.constructor.NODE_TYPES.RELATION;
        node.children = this.parseQuery(
          value,
          this.relations[collectionName][field].collectionName,
        );
        return acc;
      }

      node.type = this.constructor.NODE_TYPES.FIELD;
      const match = field.match(new RegExp(`^(.*)_(${Object.keys(this.operators).join('|')})$`));

      if (match) {
        node.fieldName = match[1];
        node.operator = match[2];
      } else {
        node.fieldName = field;
      }

      return acc;
    }, []);
  }

  branchToMongo(branch, namespace = '', fieldResolvers = {}) {
    return branch.reduce((acc, node) => {
      if (fieldResolvers[node.field]) {
        fieldResolvers[node.field](acc, node, branch);
        return acc;
      }

      if (node.type === this.constructor.NODE_TYPES.FIELD) {
        Object.assign(acc, {
          [`${namespace}${node.fieldName}`]: node.operator
            ? this.operators[node.operator](node.value)
            : node.value,
        });
      }

      if (node.type === this.constructor.NODE_TYPES.LOGICAL_QUERY) {
        Object.assign(acc, {
          [`$${node.field.toLowerCase()}`]: node.children.map(children =>
            this.branchToMongo(children, namespace, fieldResolvers),
          ),
        });
      }

      if (node.type === this.constructor.NODE_TYPES.RELATION) {
        Object.assign(acc, {
          [node.field]: this.branchToMongo(node.children, '', fieldResolvers),
        });
      }

      return acc;
    }, {});
  }

  toPipeline(
    { where = {}, skip, after, first, last, pivot, orderBy = [] } = {},
    { repository, pipeline = repository.createPipeline(), fieldResolvers = {} },
  ) {
    const tree = this.parseQuery(where, repository.collectionName);
    const matchersBranch = tree.filter(node => node.type !== this.constructor.NODE_TYPES.RELATION);

    if (matchersBranch.length) {
      pipeline.match(this.branchToMongo(matchersBranch, '', fieldResolvers));
    }

    tree.filter(node => node.type === this.constructor.NODE_TYPES.RELATION).forEach(node => {
      pipeline.lookup(node.field);
      pipeline.match(this.branchToMongo(node.children, `${node.field}.`, fieldResolvers));
    });

    if (pivot) {
      if (!orderBy.length) {
        pipeline.match({
          _id: {
            [`${after ? '$gt' : '$lt'}`]: pivot._id,
          },
        });
      } else {
        const comparators = after
          ? {
              asc: '$gt',
              desc: '$lt',
            }
          : {
              asc: '$lt',
              desc: '$gt',
            };

        const matchers = orderBy.reduce(
          (acc, { field, order }) => ({
            ...acc,
            ...(has(pivot, field)
              ? {
                  [field]: {
                    [comparators[order.toLowerCase()]]: get(pivot, field),
                  },
                }
              : {}),
          }),
          {},
        );

        if (Object.keys(matchers).length) {
          pipeline.match(matchers);
        }
      }
    }

    if (orderBy.length) {
      pipeline.sort(
        orderBy.reduce(
          (acc, { field, order }) => ({
            ...acc,
            [field]: order,
          }),
          {},
        ),
      );
    }

    if (skip) {
      pipeline.skip(parseInt(skip, 10));
    }

    if (first) {
      pipeline.limit(parseInt(first, 10));
    }

    if (last) {
      throw new Error('Operator "last" is not supported!');
    }

    return pipeline;
  }
}

export default GQLQueryParser;
