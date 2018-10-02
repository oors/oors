import { ApolloServer } from 'apollo-server-express';
import costAnalysis from 'graphql-cost-analysis';

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
        costAnalysis({ variables: req.body.variables, ...this.costAnalysisConfig }),
      ],
    };
  }
}

export default Server;
