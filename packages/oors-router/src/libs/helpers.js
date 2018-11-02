export { toBSON, idPattern } from 'oors-mongodb/build/libs/helpers';

export const wrapHandler = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next))
    .then(response => {
      if (typeof response !== 'undefined') {
        res.json(response);
      }
    })
    .catch(next);
