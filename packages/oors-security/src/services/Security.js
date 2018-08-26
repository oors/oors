/* eslint-disable class-methods-use-this */
import invariant from 'invariant';

class Security {
  constructor({ UserRepository, GroupRepository }) {
    this.UserRepository = UserRepository;
    this.GroupRepository = GroupRepository;
  }

  async setUserPermissions({ userId, permissions }) {
    invariant(userId, 'User id is required!');
    invariant(permissions && Array.isArray(permissions), 'Permissions array is required!');

    const { UserRepository } = this;

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

  async getUserPermissions({ userId, includeGroups = false }) {
    invariant(userId, 'User id is required!');

    const { UserRepository, GroupRepository } = this;

    const user = await UserRepository.findOne({
      query: {
        userId,
      },
    });

    let groupsPermissions = [];

    if (!!includeGroups && Array.isArray(user.groupIds) && user.groupIds.length) {
      const groups = await GroupRepository.findMany({
        query: {
          _id: {
            $in: user.groupIds,
          },
        },
      });

      groupsPermissions = groups.reduce((acc, group) => [...acc, ...group.permissions], []);
    }

    return [...user.permissions, ...groupsPermissions];
  }

  async setUserGroups({ userId, groups }) {
    invariant(userId, 'User id is required!');
    invariant(groups && Array.isArray(groups), 'Groups array is required!');

    const { UserRepository, GroupRepository } = this;

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
    });
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
