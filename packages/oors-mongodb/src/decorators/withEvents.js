import EventEmitter from 'events';
import invariant from 'invariant';

export default (
  repository,
  {
    methods = [
      'findById',
      'findOne',
      'findMany',
      'createOne',
      'createMany',
      'updateOne',
      'updateMany',
      'replaceOne',
      'deleteOne',
      'deleteMany',
      'save',
    ],
    emitter,
  },
) => {
  invariant(emitter instanceof EventEmitter, 'emitter has to be an instance of EventEmitter!');

  methods.forEach(method => {
    const previous = repository[method];
    Object.assign(repository, {
      [method]: async (...args) => {
        emitter.emit(`before:${method}`, ...args);
        const result = await previous.call(repository, ...args);
        emitter.emit(`after:${method}`, result, ...args);
        return result;
      },
    });
  });

  return repository;
};
