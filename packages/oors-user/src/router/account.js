import { Router } from 'express';
import { ObjectID as objectId } from 'mongodb';
import { helpers } from 'oors-router';
import validate from 'oors-router/build/middlewares/validate';
import injectServices from '../middlewares/injectServices';

const { wrapHandler } = helpers;
const router = Router();

router.use(injectServices);

router.get(
  '/:id/confirm',
  validate({
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
      },
      required: ['id'],
    },
  }),
  wrapHandler(async req => {
    const { Account } = req.services;
    return Account.confirm(objectId(req.params.id));
  }),
);

router.post(
  '/resend-activation-email',
  validate({
    body: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
      },
      required: ['email'],
    },
  }),
  wrapHandler(async req => {
    const { Account } = req.services;
    const { email } = req.body;

    await Account.resendActivationEmail({ email });

    return { ok: true };
  }),
);

export default router;
