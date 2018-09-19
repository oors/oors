/* eslint-disable */
/* eslint-disable class-methods-use-this */

/**
 allProducts({
  where: {
    name_contains: 'fsafa',
    OR: [{
      price_gte: 100
    }, {
      category: {
        name_contains: 'fsafsafsaf'
      }
    }]
  }
})
 */

class GQLQueryParser {
  static NODE_TYPES = {
    FIELD: Symbol('field'),
    RELATION: Symbol('relation'),
    LOGICAL_QUERY: Symbol('nestedQuery'),
  };

  constructor() {
    this.operators = {};

    this.addOperator('not', (value, matchers) => ({ ...matchers, $ne: value }));
  }

  addOperator(name, transfomer) {
    this.operators[name] = transfomer;
  }

  parseQuery(query, repository) {
    return Object.keys(query).reduce((acc, field) => {
      const value = query[field];
      const node = {
        repository,
        field,
        value,
        operator: null,
        children: false,
      };

      acc.push(node);

      if (['and', 'or', 'nor'].includes(field.toLowerCase())) {
        node.type = this.constructor.NODE_TYPES.LOGICAL_QUERY;
        node.children = this.parseQuery(value, repository);
        return acc;
      }

      if (Object.keys(repository.relations).includes(field)) {
        node.type = this.constructor.NODE_TYPES.RELATION;
        node.children = this.parseQuery(value, Object.keys(repository.relations[field].repository));
        return acc;
      }

      node.type = this.constructor.NODE_TYPES.FIELD;
      const match = field.match(new RegExp(`^(.*)_(${Object.keys(this.operators).join('|')})$`));

      if (match) {
        node.fieldName = match[1];
        node.operator = match[2];
      }

      return acc;
    }, []);
  }

  applyOwnMatchers(parsedQuery, pipeline) {
    const tree = [];
    const matchers = {};

    parsedQuery.forEach(node => {
      const fieldResolver = this.fieldResolvers[node.field];

      if (fieldResolver) {
        fieldResolver(pipeline, node, matchers);
        return;
      }

      if (node.type === this.constructor.NODE_TYPES.FIELD) {
      }
    });

    const match = parsedQuery.reduce((acc, node) => acc, {});

    Object.keys(filters).forEach(field => {
      const value = filters[field];
      const fieldResolver = this.fieldResolvers[field];

      if (fieldResolver) {
        fieldResolver(pipeline, value, filters, this);
        return;
      }

      if (this.isRelation(field)) {
        relations.push({
          field,
          filters: value,
        });
      }
    });
  }

  toPipeline(
    { where = {}, skip, after, first, last, pivot, orderBy },
    repository,
    pipeline = repository.createPipeline(),
  ) {
    const parsedQuery = this.parseQuery(where, repository);
    return parsedQuery;
    // this.applyFieldResolvers(parsedQuery, pipeline);
    // this.applyOwnMatchers(parsedQuery, pipeline);
    // this.applyRelationsMatchers(parsedQuery, pipeline);
    // return pipeline;
  }
}

export default GQLQueryParser;
