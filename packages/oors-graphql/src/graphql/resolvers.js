import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import GraphQLJSON from 'graphql-type-json';

export default {
  Mutation: {
    ping: () => 'pong',
  },
  Query: {
    hello: () => 'Oooors!',
  },
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    parseValue: value => new Date(value),
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10);
      }

      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }

      return null;
    },
    serialize: value => {
      const date = value instanceof Date ? value : new Date(value);
      return date.toISOString();
    },
  }),
  JSON: GraphQLJSON,
};
