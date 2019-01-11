import { validators as v } from 'easevalidation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Repository } from 'oors-mongodb';
import isObjectId from 'oors-mongodb/build/libs/isObjectId';
import { /* roles, */ defaultRoles } from '../constants/user';

class User extends Repository {
  static schema = {
    accountId: [v.isRequired(), isObjectId()],
    username: v.isAny(v.isUndefined(), v.isString()),
    name: v.isAny(v.isUndefined(), v.isString()),
    email: v.isAny(v.isUndefined(), v.isEvery(v.isString(), v.isEmail())),
    password: v.isAny(v.isUndefined(), v.isEvery(v.isString(), v.isLength({ min: 5 }))),
    salt: v.isAny(v.isUndefined(), v.isString()),
    isActive: [v.isDefault(true), v.isBoolean()],
    isOwner: [v.isDefault(true), v.isBoolean()],
    roles: [v.isDefault(defaultRoles), v.isArray(v.isString())],
    resetPassword: [
      v.isDefault({}),
      v.isSchema({
        token: v.isAny(v.isUndefined(), v.isString()),
        resetAt: v.isAny(v.isUndefined(), v.isDate()),
      }),
    ],
    lastLogin: v.isAny(v.isUndefined(), v.isDate()),
    authProviders: [
      v.isDefault({}),
      v.isObject({
        validator: v.isSchema({
          id: [v.isRequired(), v.isString()],
          accessToken: v.isAny(v.isUndefined(), v.isString()),
          refreshToken: v.isAny(v.isUndefined(), v.isString()),
          createdAt: v.isAny(v.isUndefined(), v.isDate()),
        }),
      }),
    ],
    failedLoginAttempts: [v.isDefault(0), v.isNumber()],
    login: [
      v.isDefault({}),
      v.isSchema({
        token: v.isAny(v.isUndefined(), v.isString()),
        createdAt: v.isAny(v.isUndefined(), v.isDate()),
      }),
    ],
  };

  static collectionName = 'userUser';

  static relations = {
    account: {
      repositoryName: 'oors.user.Account',
      localField: 'accountId',
      foreignField: '_id',
      type: 'one',
    },
    logins: {
      repositoryName: 'oors.user.Login',
      localField: '_id',
      foreignField: 'userId',
      type: 'many',
    },
  };

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
          failedLoginAttempts: 0,
        },
      },
    });
  }

  async resetPassword(userId) {
    return this.updateOne({
      query: { _id: userId },
      update: {
        $set: {
          resetPassword: {
            token: crypto.randomBytes(20).toString('hex'),
            resetAt: new Date(),
          },
        },
      },
    });
  }

  createLoginToken(userId) {
    return this.updateOne({
      query: { _id: userId },
      update: {
        $set: {
          login: {
            token: crypto.randomBytes(20).toString('hex'),
            createdAt: new Date(),
          },
        },
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
      finalData.password = await this.module.getConfig('hashPassword')(
        finalData.password,
        finalData.salt,
      );
    }

    return finalData;
  }

  getLockedQuery = () => ({
    failedLoginAttempts: {
      $gt: this.module.getConfig('lockable.maxFailedAttempts'),
    },
  });
}

export default User;
