/* eslint-disable class-methods-use-this, no-underscore-dangle */
import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError } from 'apollo-server';
import { /* DirectiveLocation, GraphQLDirective, */ defaultFieldResolver } from 'graphql';

class RequiresPermissionsDirective extends SchemaDirectiveVisitor {
  // static getDirectiveDeclaration(directiveName = 'requiresPermissions') {
  //   return new GraphQLDirective({
  //     name: directiveName,
  //     locations: [DirectiveLocation.FIELD_DEFINITION],
  //   });
  // }

  visitObject(type) {
    const fields = type.getFields();
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];

      if (!field.permissionsConfig) {
        field.permissionsConfig = {
          all: [],
          any: [],
        };
      }

      field.permissionsConfig.all.push(...(this.args.all || []));
      field.permissionsConfig.any.push(...(this.args.any || []));

      this.wrapField(field);
    });
  }

  visitFieldDefinition(field) {
    if (!field.permissionsConfig) {
      // eslint-disable-next-line no-param-reassign
      field.permissionsConfig = {
        all: [],
        any: [],
      };
    }

    field.permissionsConfig.all.push(...(this.args.all || []));
    field.permissionsConfig.any.push(...(this.args.any || []));
    this.wrapField(field);
  }

  wrapField(field) {
    const { permissionsConfig } = field;
    if (permissionsConfig.isWrapped) {
      return;
    }

    permissionsConfig.isWrapped = true;
    const { resolve = defaultFieldResolver } = field;

    Object.assign(field, {
      resolve: async (root, args, context, info) => {
        if (!context.user) {
          throw new AuthenticationError('Not authenticated!');
        }

        const { permissionsManager, user } = context;
        const { all, any } = field.permissionsConfig;

        try {
          if (all.length) {
            await permissionsManager.checkAll(user, all, root);
          }

          if (any.length) {
            await permissionsManager.checkAny(user, any, root);
          }
        } catch (error) {
          throw new ForbiddenError(error.message);
        }

        return resolve.call(this, root, args, context, info);
      },
    });
  }
}

export default RequiresPermissionsDirective;
