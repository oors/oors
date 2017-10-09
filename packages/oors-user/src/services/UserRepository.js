import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Repository } from 'oors-mongodb';
import { decorators } from 'octobus.js';

const { service } = decorators;

class UserRepository extends Repository {
  static hashPassword({ password, salt }) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(password, salt, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  }

  setServiceBus(serviceBus) {
    super.setServiceBus(serviceBus);
    this.User = serviceBus.extract('User');
  }

  @service()
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

  @service()
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

  @service()
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

  @service()
  async resetPassword(userId) {
    const resetPassword = {
      token: crypto.randomBytes(20).toString('hex'),
      resetAt: new Date(),
    };

    return this.UserRepository.updateOne({
      query: { _id: userId },
      update: {
        $set: { resetPassword },
      },
    });
  }

  save(data) {
    const { hashPassword, ...restData } = data;

    if (!restData.salt) {
      restData.salt = bcrypt.genSaltSync(10);
    }

    const shouldHashPassword =
      (!restData._id || hashPassword) && !!restData.password;

    if (!shouldHashPassword) {
      return super.save(restData);
    }

    return this.User
      .hashPassword({
        password: restData.password,
        salt: restData.salt,
      })
      .then(password =>
        super.save({
          ...restData,
          password,
        }),
      );
  }
}

export default UserRepository;
