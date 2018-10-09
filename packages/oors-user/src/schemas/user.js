import { roles, defaultRoles } from '../constants/user';

export default {
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
