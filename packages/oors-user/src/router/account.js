import { validators as v } from 'easevalidation';
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
    params: v.isSchema({
      id: [v.isRequired(), v.isString()],
    }),
  }),
  wrapHandler(async req => {
    const { AccountRepository } = req.services.repositories;

    return AccountRepository.confirm(objectId(req.params.id));
  }),
);

router.post(
  '/resend-activation-email',
  validate({
    body: v.isSchema({
      email: [v.isRequired(), v.isString(), v.isEmail()],
    }),
  }),
  wrapHandler(async req => {
    const { email } = req.body;

    const { UserRepository, AccountRepository } = req.services.repositories;

    const user = await UserRepository.findOne({
      query: { email },
    });

    if (!user) {
      throw new Error('User not found!');
    }

    const account = await AccountRepository.findById(user.accountId);

    if (account.isConfirmed) {
      throw new Error('Account is already confirmed!');
    }

    // @TODO: send the actual email

    return { ok: true };
  }),
);

export default router;
