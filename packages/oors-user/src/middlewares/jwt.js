import jwt from 'express-jwt';
import { helpers } from 'oors-express';

const { createMiddleware } = helpers;

export default createMiddleware({
  id: 'jwt',
  factory: jwt,
  params: {
    requestProperty: 'jwtPayload',
    credentialsRequired: false,
  },
});
