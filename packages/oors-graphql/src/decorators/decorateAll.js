// decorateAll({
//   findOne,
//   findMany
// }, [dec1, dec2])
//
// decorateAll([findOne, findMany], dec)
import compose from './compose';

export default (resolvers, decorators) => {
  const decorator = Array.isArray(decorators) ? compose(...decorators) : decorators;

  if (Array.isArray(resolvers)) {
    return resolvers.map(resolver => decorator(resolver));
  }

  return Object.keys(resolvers).reduce(
    (acc, key) => ({
      ...acc,
      [key]: decorator(resolvers[key]),
    }),
    {},
  );
};
