import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Repository } from 'oors-mongodb';
import { hashPassword } from '../libs/helpers';
import schema from '../schemas/user';

class UserRepository extends Repository {
  static schema = schema;

  static collectionName = 'userUser';

  findOneByUsername(username) {
    return this.findOne({
      query: {
        $or: [
          {
            username,
          },
          {
            email: username,
          },
        ],
      },
    });
  }

  findOneByUsernameOrEmail({ username, email }) {
    return this.findOne({
      query: {
        $or: [
          {
            username,
          },
          {
            email,
          },
        ],
      },
    });
  }

  updatePassword({ userId, password }) {
    return this.updateOne({
      query: { _id: userId },
      update: {
        $set: {
          resetPassword: {},
          password,
        },
      },
    });
  }

  async resetPassword(userId) {
    const resetPassword = {
      token: crypto.randomBytes(20).toString('hex'),
      resetAt: new Date(),
    };

    return this.updateOne({
      query: { _id: userId },
      update: {
        $set: { resetPassword },
      },
    });
  }

  async parse(data) {
    const { hashPassword: doHashPassword, ...finalData } = await Repository.prototype.parse.call(
      this,
      data,
    );

    if (!finalData.salt) {
      finalData.salt = bcrypt.genSaltSync(10);
    }

    const shouldHashPassword = (!finalData[this.id] || doHashPassword) && !!finalData.password;

    if (shouldHashPassword) {
      finalData.password = await hashPassword(finalData);
    }

    return finalData;
  }
}

export default UserRepository;
