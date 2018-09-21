import util from 'util';
import withHooks from './withHooks';

export default (log = console.log.bind(console)) => repository =>
  withHooks({
    beforeAll: (method, ...args) => {
      const { name } = repository.constructor;
      const { collectionName } = repository;
      const finalArgs =
        method === 'aggregate' ? [repository.toMongoPipeline(args[0]), ...args.slice(1)] : args;
      const formattedArgs = util.inspect(finalArgs, {
        depth: null,
        colors: true,
      });

      log(`${name}.${method} (${collectionName}) called with args: \n${formattedArgs}`);
    },
  })(repository);
