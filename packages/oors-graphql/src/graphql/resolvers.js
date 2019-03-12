import padStart from 'lodash/padStart';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import GraphQLJSON from 'graphql-type-json';
import { GraphQLUpload } from 'graphql-upload';

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
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue: value => new Date(value),
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING || !ast.value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Invalid date format');
      }

      const date = new Date(ast.value);

      if (date.toString() === 'Invalid Date') {
        throw new Error('Invalid Date');
      }

      return date;
    },
    serialize: value => {
      const date = value instanceof Date ? value : new Date(value);

      if (date.toString() === 'Invalid Date') {
        throw new Error('Invalid Date');
      }

      return [
        date.getFullYear(),
        padStart(date.getMonth() + 1, 2, 0),
        padStart(date.getDate(), 2, 0),
      ].join('-');
    },
  }),
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,
};
