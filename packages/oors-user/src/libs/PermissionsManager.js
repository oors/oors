import invariant from 'invariant';
import flattenDeep from 'lodash/flattenDeep';
import pick from 'lodash/pick';
import NotAllowed from '../errors/NotAllowed';

class PermissionsManager {
  static generateCRUD(resource) {
    return ['create', 'read', 'update', 'delete'].map(action => ({
      permission: `${resource}.${action}`,
      description: `"${action}" action for the "${resource}" resource`,
    }));
  }

  constructor(
    aliases = {
      view: 'read',
      access: 'read',
    },
  ) {
    this.permissions = {};
    this.aliases = aliases || {};
  }

  createAlias(forPermission, toPermission) {
    this.aliases[forPermission] = toPermission;
  }

  getAll() {
    return Object.keys(this.permissions).reduce(
      (acc, permission) => [
        ...acc,
        {
          permission,
          ...pick(this.permissions[permission], ['description', 'dependencies']),
        },
      ],
      [],
    );
  }

  has(name) {
    return Object.keys(this.permissions).includes(name);
  }

  define(permission, check, rawConfig = {}) {
    if (Array.isArray(permission)) {
      return permission.forEach(({ permission: permissionName, ...itemConfig }) =>
        this.define(permissionName, check, { ...rawConfig, ...itemConfig }),
      );
    }

    invariant(permission && typeof permission === 'string', 'Permissions name is required!');
    invariant(
      typeof check === 'function',
      `Missing required check function for "${permission}" permission!`,
    );

    const config = {
      description: `${permission} permission definition`,
      dependencies: [],
      isValidObject: () => true,
      ...rawConfig,
      check,
    };

    if (this.has(permission)) {
      throw new Error(`Can't add permission with a name of ${permission}. Already exists!`);
    }

    const dependencies = flattenDeep(config.dependencies);

    dependencies.forEach(dependency => {
      if (!this.has(dependency)) {
        throw new Error(
          `Unable to find permission named "${dependency}" required as a dependency of "${permission}".`,
        );
      }
    });

    this.permissions[permission] = config;

    return this;
  }

  async can(subject, permissionName, object) {
    try {
      await this.check(subject, permissionName, object);
    } catch (err) {
      if (err instanceof NotAllowed) {
        return false;
      }

      throw err;
    }

    return true;
  }

  async checkAny(subject, permissions, object) {
    const result = await Promise.all(
      permissions.map(permission => this.can(subject, permission, object)),
    );

    const isAllowed = result.some(item => !!item);

    if (!isAllowed) {
      throw new NotAllowed(`Failed permission check.`);
    }
  }

  async checkAll(subject, permissions, object, parallel = true) {
    const walkPermissions = permissions.map(item => {
      if (Array.isArray(item)) {
        return () => this.checkAll(subject, item, object, !parallel);
      }
      return () => this.check(subject, item, object);
    });

    return parallel
      ? Promise.all(walkPermissions.map(task => task()))
      : walkPermissions.reduce((promise, task) => promise.then(task), Promise.resolve());
  }

  async check(subject, permissionName, object) {
    invariant(subject, 'Subject is required!');
    invariant(permissionName && typeof permissionName === 'string', 'Permission is required!');

    const name = Object.keys(this.aliases).includes(permissionName)
      ? this.aliases[permissionName]
      : permissionName;

    if (!this.has(name)) {
      throw new Error(`Unable to find permission named "${name}" when checking access.`);
    }

    const permission = this.permissions[name];

    if (!permission.isValidObject(object)) {
      throw new NotAllowed(
        `Failed permission check "${name}"! Reason: received invalid object (${object}).`,
      );
    }

    if (permission.dependencies.length) {
      await this.checkAll(subject, permission.dependencies, object);
    }

    const isAllowed = await permission.check(subject, object);

    if (!isAllowed) {
      throw new NotAllowed(`Failed permission check "${name}"! Reason: failed check function.`);
    }
  }
}

export default PermissionsManager;
