/* eslint-disable class-methods-use-this */
import Joi from 'joi';
import { ServiceContainer, decorators } from 'octobus.js';

const { service, withSchema } = decorators;

class Security extends ServiceContainer {
  @service()
  @withSchema({
    userId: Joi.any().required(),
    permissions: Joi.array().items(Joi.string()).required(),
  })
  async setUserPermissions({ userId, permissions }, { extract }) {
    const UserRepository = extract('UserRepository');

    const user = await UserRepository.findOne({
      query: {
        userId,
      },
    });

    return user
      ? UserRepository.updateOne({
        query: {
          userId,
        },
        update: {
          $set: {
            permissions,
          },
        },
      })
      : UserRepository.createOne({
        userId,
        permissions,
      });
  }

  @service()
  @withSchema({
    userId: Joi.any().required(),
    includeGroups: Joi.boolean().default(true),
  })
  async getUserPermissions({ userId, includeGroups }, { extract }) {
    const UserRepository = extract('UserRepository');
    const GroupRepository = extract('GroupRepository');
    const user = await UserRepository.findOne({
      query: {
        userId,
      },
    });

    let groupsPermissions = [];

    if (includeGroups && Array.isArray(user.groupIds) && user.groupIds.length) {
      const groups = await GroupRepository.findMany({
        query: {
          _id: {
            $in: user.groupIds,
          },
        },
      }).then(c => c.toArray());

      groupsPermissions = groups.reduce(
        (acc, group) => [...acc, ...group.permissions],
        [],
      );
    }

    return [...user.permissions, ...groupsPermissions];
  }

  @service()
  @withSchema({
    userId: Joi.any().required(),
    groups: Joi.array().items(Joi.string()).required(),
  })
  async setUserGroups({ userId, groups }, { extract }) {
    const UserRepository = extract('UserRepository');
    const GroupRepository = extract('GroupRepository');
    const user = await UserRepository.findOne({
      query: {
        userId,
      },
    });
    const fetchedGroups = await GroupRepository.findMany({
      query: {
        name: {
          $in: groups,
        },
      },
    }).then(c => c.toArray());
    const groupIds = fetchedGroups.map(({ _id }) => _id);

    return user
      ? UserRepository.updateOne({
        query: {
          userId,
        },
        update: {
          $set: {
            groupIds,
          },
        },
      })
      : UserRepository.insertOne({
        query: {
          userId,
          groupIds,
        },
      });
  }
}

export default Security;
