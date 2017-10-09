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
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue: value => new Date(value),
    serialize: value => value.getTime(),
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10);
      }

      return null;
    },
  }),
  JSON: GraphQLJSON,
};
