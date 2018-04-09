import Application from '../../packages/oors-presets/src/applications/Standard';
import Module from '../../packages/oors/src/libs/Module';

class SimpleModule extends Module {
  hooks = {
    'oors.graphQL.load': ({ addTypeDefs }) => {
      addTypeDefs(`
        extend type Query {
          sayHi(name: String!): String!
        }

        type Subscription {
          tick: Int!
        }
      `);
    },
  };

  async setup() {
    const { addResolvers, pubsub } = await this.dependency('oors.graphQL');

    addResolvers({
      Query: {
        sayHi: (_, { name }) => `Hi ${name}!!!`,
      },
      Subscription: {
        tick: {
          subscribe: () => pubsub.asyncIterator('tick'),
        },
      },
    });

    let counter = 0;
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
