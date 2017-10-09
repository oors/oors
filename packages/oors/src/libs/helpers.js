export const createMiddleware = ({ id, factory, params }) => {
  const middleware = opts => {
    let finalOptions = params;
    if (typeof opts !== 'undefined') {
      if (typeof opts === 'object') {
        finalOptions = Object.assign({}, params || {}, opts);
      } else {
        finalOptions = opts;
      }
    }
    return factory(finalOptions);
  };

  Object.assign(middleware, {
    id,
    factory,
    params,
  });

  return middleware;
};
