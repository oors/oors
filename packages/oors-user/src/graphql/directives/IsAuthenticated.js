/* eslint-disable class-methods-use-this, no-underscore-dangle */
import { SchemaDirectiveVisitor, AuthenticationError } from 'apollo-server';
import { /* DirectiveLocation, GraphQLDirective, */ defaultFieldResolver } from 'graphql';

class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
  // static getDirectiveDeclaration(directiveName = 'isAuthenticated') {
  //   return new GraphQLDirective({
  //     name: directiveName,
  //     locations: [DirectiveLocation.FIELD_DEFINITION],
  //   });
  // }

  visitObject(type) {
    const fields = type.getFields();
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      this.wrapField(field);
    });
  }

  visitFieldDefinition(field) {
    this.wrapField(field);
  }

  wrapField(field) {
    if (field.isAuthenticatedWrapped) {
      return;
    }

    const { resolve = defaultFieldResolver } = field;

    Object.assign(field, {
      isAuthenticatedWrapped: true,
      resolve: async (root, args, context, info) => {
        if (!context.user) {
          throw new AuthenticationError('Not authenticated!');
        }

        return resolve.call(this, root, args, context, info);
      },
    });
  }
}

export default IsAuthenticatedDirective;
