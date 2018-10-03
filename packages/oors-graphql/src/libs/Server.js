import { ApolloServer } from 'apollo-server-express';
import costAnalysis from 'graphql-cost-analysis';
import { ValidationError } from 'apollo-server';

class Server extends ApolloServer {
  constructor({ costAnalysisConfig, ...config }) {
    super(config);
    this.costAnalysisConfig = costAnalysisConfig;
  }

  async createGraphQLServerOptions(req, res) {
    const options = await super.createGraphQLServerOptions(req, res);
    return {
      ...options,
      validationRules: [
        ...options.validationRules,
        costAnalysis({
          variables: req.body.variables,
          createError: (max, actual) =>
            new ValidationError(
              `GraphQL query exceeds maximum complexity, please remove some nesting or fields and try again. (max: ${max}, actual: ${actual})`,
            ),
          ...this.costAnalysisConfig,
        }),
      ],
    };
  }
}

export default Server;
