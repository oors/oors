import Application from '../../packages/oors-presets/src/applications/Standard';
import Module from '../../packages/oors/src/libs/Module';
import withSchema from '../../packages/oors-graphql/src/decorators/withSchema';

class SimpleModule extends Module {
  hooks = {
    'oors.graphql.load': ({ addTypeDefs }) => {
      addTypeDefs(`
        extend type Query {
          sayHi(name: String!): String!
        }

        extend type Mutation {
          incrementCounter(value: Int!): Int!
        }

        type Subscription {
          tick: Int!
        }
      `);
    },
  };

  async setup() {
    let counter = 0;
    const { addResolvers, pubsub } = await this.dependency('oors.graphql');

    addResolvers({
      Query: {
        sayHi: (_, { name }) => `Hi ${name}!!!`,
      },
      Subscription: {
        tick: {
          subscribe: () => pubsub.asyncIterator('tick'),
        },
      },
      Mutation: {
        incrementCounter: withSchema({
          type: 'object',
          properties: {
            value: {
              type: 'integer',
              minimum: 0,
            },
          },
        })((_, { value }) => {
          counter += value;
          return counter;
        }),
      },
    });

    setInterval(() => {
      pubsub.publish('tick', {
        tick: counter,
      });
      counter += 1;
    }, 1000);
  }
}

const app = new Application();

app.addModules(new SimpleModule());

app.get('/', (req, res) => {
  res.send('Hello from oors!');
});

app.listen().catch(console.log.bind(console));
