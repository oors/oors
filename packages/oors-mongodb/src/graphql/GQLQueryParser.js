import has from 'lodash/has';
import uniq from 'lodash/uniq';
import get from 'lodash/get';
import escapeRegexp from 'escape-string-regexp';
import { ObjectID as objectId } from 'mongodb';

class GQLQueryParser {
  static NODE_TYPES = {
    FIELD: 'FIELD',
    RELATION: 'RELATION',
    LOGICAL_QUERY: 'LOGICAL_QUERY',
  };

  constructor(module) {
    this.module = module;
    this.operators = {};
    this.nodeVisitors = [];

    this.configure();
  }

  configure() {
    this.addOperator('not', value => ({ $ne: value }));
    this.addOperator('in', value => ({ $in: value }));
    this.addOperator(['nin', 'notIn'], value => ({ $nin: value }));
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
    this.addOperator(['all', 'every'], value => ({ $all: value }));
    this.addOperator(['any', 'some'], value => ({ $elemMatch: value }));

    this.nodeVisitors.push(node => {
      if (
        node.type === this.constructor.NODE_TYPES.FIELD &&
        (node.field === 'id' || node.fieldName === 'id')
      ) {
        Object.assign(node, {
          value: Array.isArray(node.value) ? node.value.map(objectId) : objectId(node.value),
          fieldName: '_id',
        });
      }
    });
  }

  get relations() {
    return this.module.get('relations');
  }

  addOperator(nameOrNames, transfomer) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    names.forEach(name => {
      this.operators[name] = transfomer;
    });
  }

  createNode = (field, value, collectionName) => {
    const node = {
      skip: false,
      collectionName,
      field,
      value,
      operator: null,
      children: null,
    };

    if (['and', 'or', 'nor'].includes(field.toLowerCase())) {
      node.type = this.constructor.NODE_TYPES.LOGICAL_QUERY;
      node.children = value.map(subQuery => this.parseQuery(subQuery, collectionName));
    } else if (Object.keys(this.relations[collectionName] || {}).includes(field)) {
      node.type = this.constructor.NODE_TYPES.RELATION;
      node.children = this.parseQuery(value, this.relations[collectionName][field].collectionName);
    } else {
      node.type = this.constructor.NODE_TYPES.FIELD;
      const match = field.match(new RegExp(`^([^_]*)_(${Object.keys(this.operators).join('|')})$`));

      if (match) {
        node.fieldName = match[1];
        node.operator = match[2];
      } else {
        node.fieldName = field;
      }
    }

    return node;
  };

  parseQuery(query, collectionName) {
    return Object.keys(query).reduce(
      (acc, field) => [...acc, this.createNode(field, query[field], collectionName)],
      [],
    );
  }

  nodesToMongo(nodes, options = {}) {
    const { namespace, pipeline } = {
      namespace: '',
      ...options,
    };

    return nodes.reduce((acc, node) => {
      if (node.skip) {
        return acc;
      }

      if (typeof node.toMongo === 'function') {
        node.toMongo(acc, { nodes, namespace, pipeline });
        return acc;
      }

      if (node.type === this.constructor.NODE_TYPES.FIELD) {
        acc[`${namespace}${node.fieldName}`] = node.operator
          ? this.operators[node.operator](node.value)
          : node.value;
      }

      if (node.type === this.constructor.NODE_TYPES.LOGICAL_QUERY) {
        const operator = `$${node.field.toLowerCase()}`;
        const queries = node.children.map(children =>
          this.nodesToMongo(children, { namespace, pipeline }),
        );

        if (!queries.length) {
          return acc;
        }

        if (!Array.isArray(acc[operator])) {
          acc[operator] = [];
        }

        acc[operator].push(...queries);
      }

      if (node.type === this.constructor.NODE_TYPES.RELATION) {
        Object.assign(
          acc,
          this.nodesToMongo(node.children, { namespace: `${node.field}.`, pipeline }),
        );
      }

      return acc;
    }, {});
  }

  visitBranch = (branch, nodeVisitors, parent) => {
    if (!branch.length) {
      return;
    }

    let index = 0;
    do {
      const node = branch[index];

      nodeVisitors.forEach(nodeVisitor =>
        nodeVisitor(node, {
          branch,
          parent,
          remove: n => {
            Object.assign(n || node, {
              skip: true,
            });
          },
          replaceWith: (field, value) => {
            Object.assign(node, this.createNode(field, value, node.collectionName));
          },
          add: (field, value) => {
            branch.push(this.createNode(field, value, node.collectionName));
          },
        }),
      );

      if (node.type === this.constructor.NODE_TYPES.LOGICAL_QUERY) {
        node.children.forEach(childNodes => this.visitBranch(childNodes, nodeVisitors, node));
      }

      if (node.type === this.constructor.NODE_TYPES.RELATION) {
        this.visitBranch(node.children, nodeVisitors, node);
      }

      index += 1;
    } while (index < branch.length);
  };

  embedsRelation = node =>
    node.type === this.constructor.NODE_TYPES.LOGICAL_QUERY &&
    node.children.some(children =>
      children.some(
        child => child.type === this.constructor.NODE_TYPES.RELATION || this.embedsRelation(child),
      ),
    );

  getEmbeddedRelations = nodes =>
    nodes.reduce((relations, node) => {
      if (node.type === this.constructor.NODE_TYPES.RELATION && !relations.includes(node.field)) {
        relations.push(node.field);
      }

      if (node.type === this.constructor.NODE_TYPES.LOGICAL_QUERY) {
        node.children.forEach(children => {
          relations.push(...this.getEmbeddedRelations(children));
        });
      }

      return uniq(relations);
    }, []);

  toPipeline(
    { where = {}, skip, after, first, last, pivot, orderBy = [] } = {},
    { repository, pipeline = repository.createPipeline(), nodeVisitors = [] },
  ) {
    const tree = this.parseQuery(where, repository.collectionName);

    this.visitBranch(tree, [...this.nodeVisitors, ...nodeVisitors]);

    // we need to split matchers that reference relations from those that don't, to filter out the data set before running the lookups
    const nodes = {
      filters: [],
      logicalWithRelations: [],
      relational: [],
    };

    tree.forEach(node => {
      if (node.type === this.constructor.NODE_TYPES.RELATION) {
        nodes.relational.push(node);
      } else if (this.embedsRelation(node)) {
        nodes.logicalWithRelations.push(node);
      } else {
        nodes.filters.push(node);
      }
    });

    if (nodes.filters.length) {
      pipeline.match(this.nodesToMongo(nodes.filters, { pipeline }));
    }

    if (nodes.logicalWithRelations) {
      this.getEmbeddedRelations(nodes.logicalWithRelations).forEach(relation => {
        pipeline.lookup(relation, { ignoreIfExists: true });
      });

      pipeline.match(this.nodesToMongo(nodes.logicalWithRelations, { pipeline }));
    }

    nodes.relational.forEach(node => {
      pipeline.lookup(node.field, { ignoreIfExists: true });
      pipeline.match(this.nodesToMongo(node.children, { namespace: `${node.field}.`, pipeline }));
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
