import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Repository } from 'oors-mongodb';
import { hashPassword } from '../libs/helpers';
import { roles, defaultRoles } from '../constants/user';

class User extends Repository {
  static schema = {
    type: 'object',
    properties: {
      accountId: {
        isObjectId: true,
      },
      username: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
      },
      salt: {
        type: 'string',
      },
      isActive: {
        type: 'boolean',
        default: true,
      },
      isOwner: {
        type: 'boolean',
        default: true,
      },
      isDeleted: {
        type: 'boolean',
      },
      roles: {
        type: 'array',
        items: {
          type: 'string',
          enum: roles,
        },
        default: defaultRoles,
      },
      resetPassword: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
          },
          resetAt: {
            instanceof: 'Date',
          },
        },
        default: {},
      },
      lastLogin: {
        instanceof: 'Date',
      },
      socialLogins: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            token: {
              type: 'string',
            },
            expiresAt: {
              instanceof: 'Date',
            },
          },
          required: ['id', 'token'],
        },
        default: [],
      },
      deletedAt: {
        instanceof: 'Date',
      },
    },
    required: ['accountId', 'username', 'name', 'email', 'password'],
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
      repositoryName: 'oors.user.UserLogin',
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
