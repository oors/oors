/* eslint-disable class-methods-use-this, no-underscore-dangle */
import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError } from 'apollo-server';
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

      if (!field.isAuthenticatedConfig) {
        field.isAuthenticatedConfig = {};
      }

      field.isAuthenticatedConfig.typeRoles = this.args.roles;

      this.wrapField(field);
    });
  }

  visitFieldDefinition(field) {
    if (!field.isAuthenticatedConfig) {
      field.isAuthenticatedConfig = {}; // eslint-disable-line no-param-reassign
    }

    field.isAuthenticatedConfig.roles = this.args.roles; // eslint-disable-line no-param-reassign
    this.wrapField(field);
  }

  wrapField(field) {
    const { isAuthenticatedConfig } = field;
    if (isAuthenticatedConfig.isWrapped) {
      return;
    }

    isAuthenticatedConfig.isWrapped = true;
    const { resolve = defaultFieldResolver } = field;

    Object.assign(field, {
      isAuthenticatedWrapped: true,
      resolve: async (root, args, context, info) => {
        if (!context.user) {
          throw new AuthenticationError('Not authenticated!');
        }

        const requiredRoles = isAuthenticatedConfig.roles || isAuthenticatedConfig.typeRoles;
        if (Array.isArray(requiredRoles) && requiredRoles.length) {
          requiredRoles.forEach(role => {
            if (!(context.user.roles || []).includes(role)) {
              throw new ForbiddenError(`Restricted access! Missing "${role}" role!`);
            }
          });
        }

        return resolve.call(this, root, args, context, info);
      },
    });
  }
}

export default IsAuthenticatedDirective;
