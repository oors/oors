import util from 'util';
import withHooks from './withHooks';

export default (log = console.log.bind(console)) => repository =>
  withHooks({
    beforeAll: (method, ...args) => {
      const { name } = repository.constructor;
      const { collectionName } = repository;
      const formattedArgs = util.inspect(args, {
        depth: null,
        colors: true,
      });

      log(`${name}.${method} (${collectionName}) called with args: \n${formattedArgs}`);
    },
  })(repository);
