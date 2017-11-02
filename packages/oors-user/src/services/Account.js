import invariant from 'invariant';

class Account {
  constructor({ AccountRepository, UserRepository, Mail }) {
    this.AccountRepository = AccountRepository;
    this.UserRepository = UserRepository;
    this.Mail = Mail;
  }

  async confirm(_id) {
    invariant(_id, 'Id is required!');
    const account = await this.AccountRepository.findById(_id);

    if (!account) {
      throw new Error('Account not found!');
    }

    if (account.isConfirmed) {
      throw new Error('Account is already confirmed!');
    }

    account.isConfirmed = true;

    return this.AccountRepository.save(account);
  }

  async resendActivationEmail(email) {
    invariant(email, 'Email is required!');

    const { UserRepository, Mail, AccountRepository } = this;

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
