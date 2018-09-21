import has from 'lodash/has';
import get from 'lodash/get';
import escapeRegexp from 'escape-string-regexp';
import { ObjectID as objectId } from 'mongodb';

class GQLQueryParser {
  static NODE_TYPES = {
    FIELD: Symbol('field'),
    RELATION: Symbol('relation'),
    LOGICAL_QUERY: Symbol('nestedQuery'),
  };

  static defaultNodeVisitors = [
    node => {
      if (
        node.type === GQLQueryParser.NODE_TYPES.FIELD &&
        (node.field === 'id' || node.fieldName === 'id')
      ) {
        Object.assign(node, {
          value: Array.isArray(node.value) ? node.value.map(objectId) : objectId(node.value),
          fieldName: '_id',
        });
      }
    },
  ];

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
        parent: null,
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

  branchToMongo(branch, namespace = '') {
    return branch.reduce((acc, node) => {
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
            this.branchToMongo(children, namespace),
          ),
        });
      }

      if (node.type === this.constructor.NODE_TYPES.RELATION) {
        Object.assign(acc, {
          [node.field]: this.branchToMongo(node.children, ''),
        });
      }

      return acc;
    }, {});
  }

  visitBranch = (branch, nodeVisitors, parent) => {
    branch.forEach(node => {
      if (node.type === this.constructor.NODE_TYPES.FIELD) {
        nodeVisitors.forEach(nodeVisitor => nodeVisitor(node, branch, parent));
      } else if (node.type === this.constructor.NODE_TYPES.LOGICAL_QUERY) {
        node.children.forEach(childNodes => this.visitBranch(childNodes, nodeVisitors, node));
      } else if (node.type === this.constructor.NODE_TYPES.RELATION) {
        this.visitBranch(node.children, nodeVisitors, node);
      }
    });
  };

  toPipeline(
    { where = {}, skip, after, first, last, pivot, orderBy = [] } = {},
    { repository, pipeline = repository.createPipeline(), nodeVisitors = [] },
  ) {
    const tree = this.parseQuery(where, repository.collectionName);

    this.visitBranch(tree, [...this.constructor.defaultNodeVisitors, ...nodeVisitors]);

    const matchersBranch = tree.filter(node => node.type !== this.constructor.NODE_TYPES.RELATION);

    if (matchersBranch.length) {
      pipeline.match(this.branchToMongo(matchersBranch, ''));
    }

    tree.filter(node => node.type === this.constructor.NODE_TYPES.RELATION).forEach(node => {
      pipeline.lookup(node.field);
      pipeline.match(this.branchToMongo(node.children, `${node.field}.`));
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
