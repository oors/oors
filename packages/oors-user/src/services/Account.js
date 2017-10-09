import Joi from 'joi';
import { ServiceContainer, decorators } from 'octobus.js';

const { service, withSchema } = decorators;

class Account extends ServiceContainer {
  setServiceBus(...args) {
    super.setServiceBus(...args);
    this.AccountRepository = this.extract('AccountRepository');
  }

  @service()
  @withSchema(Joi.object().required())
  async confirm(_id) {
    const account = await this.AccountRepository.findById(_id);

    if (!account) {
      throw new Error('Account not found!');
    }

    if (account.isConfirmed) {
      throw new Error('Account is already confirmed!');
    }

    account.isConfirmed = true;

    return this.AccountRepository.replaceOne(account);
  }

  @service()
  @withSchema(Joi.string().email().required())
  async resendActivationEmail(email) {
    const UserRepository = this.extract('user.UserRepository');
    const Mail = this.extract('mailer.Mail');

    const user = await UserRepository.findOne({
      query: { email },
    });

    if (!user) {
      throw new Error('User not found!');
    }

    const account = await this.AccountRepository.findById(user.accountId);

    if (account.isConfirmed) {
      throw new Error('Account is already confirmed!');
    }

    await Mail.sendActivationEmail({
      user,
      account,
    });

    return {
      user,
      account,
    };
  }
}

export default Account;
