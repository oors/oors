import { validators as v } from 'easevalidation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Repository } from 'oors-mongodb';
import isObjectId from 'oors-mongodb/build/libs/isObjectId';
import { hashPassword } from '../libs/helpers';
import { roles, defaultRoles } from '../constants/user';

class User extends Repository {
  static schema = {
    accountId: [v.isRequired(), isObjectId()],
    username: [v.isRequired(), v.isString()],
    name: [v.isRequired(), v.isString()],
    email: [v.isRequired(), v.isString(), v.isEmail()],
    password: [v.isRequired(), v.isString()],
    salt: v.isAny(v.isUndefined(), v.isString()),
    isActive: [v.isDefault(true), v.isBoolean()],
    isOwner: [v.isDefault(true), v.isBoolean()],
    roles: [v.isDefault(defaultRoles), v.isArray(v.isString(), v.isOneOf(roles))],
    resetPassword: [
      v.isDefault({}),
      v.isSchema({
        token: v.isAny(v.isUndefined(), v.isString()),
        resetAt: v.isAny(v.isUndefined(), v.isDate()),
      }),
    ],
    lastLogin: v.isAny(v.isUndefined(), v.isDate()),
    socialLogins: [
      v.isDefault([]),
      v.isArray(
        v.isSchema({
          id: [v.isRequired(), v.isString()],
          name: v.isAny(v.isUndefined(), v.isString()),
          email: v.isAny(v.isUndefined(), v.isEvery(v.isString(), v.isEmail())),
          token: [v.isRequired(), v.isString()],
          expiresAt: v.isAny(v.isUndefined(), v.isDate()),
        }),
      ),
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

export default User;
