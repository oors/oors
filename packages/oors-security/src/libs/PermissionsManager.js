import assert from 'assert';
import Joi from 'joi';
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

  constructor({
    extractor = subject => subject.permissions,
    aliases = {
      view: 'read',
      access: 'read',
    },
  }) {
    this.permissions = {};
    this.aliases = aliases;
    this.extractor = extractor;
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
          ...pick(this.permissions[permission], [
            'description',
            'dependencies',
          ]),
        },
      ],
      [],
    );
  }

  has(name) {
    return Object.keys(this.permissions).includes(name);
  }

  define(permission, rawConfig = {}) {
    if (Array.isArray(permission)) {
      return permission.forEach(
        ({ permission: permissionName, ...itemConfig }) =>
          this.define(permissionName, { ...rawConfig, ...itemConfig }),
      );
    }

    const config = Joi.attempt(rawConfig, {
      description: Joi.string().default(`${permission} permission definition`),
      dependencies: Joi.array().default([]),
      check: Joi.func().default(() => true),
      isValidObject: Joi.func().default(() => true),
    });

    if (this.has(permission)) {
      throw new Error(
        `Can't add permission with a name of ${permission}. Already exists!`,
      );
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

  async checkAll(subject, permissions, object, parallel = true) {
    const walkPermissions = permissions.map(item => {
      if (Array.isArray(item)) {
        return () => this.checkAll(subject, item, object, !parallel);
      }
      return () => this.check(subject, item, object);
    });

    return parallel
      ? Promise.all(walkPermissions.map(task => task()))
      : walkPermissions.reduce(
          (promise, task) => promise.then(task),
          Promise.resolve(),
        );
  }

  async check(subject, permissionName, object) {
    assert(subject, 'Subject is required!');
    assert(
      permissionName && typeof permissionName === 'string',
      'Permission is required!',
    );

    const name = Object.keys(this.aliases).includes(permissionName)
      ? this.aliases[permissionName]
      : permissionName;

    if (!this.has(name)) {
      throw new Error(
        `Unable to find permission named "${name}" when checking access.`,
      );
    }

    const permission = this.permissions[name];

    const subjectPermissions = await this.extractor(subject);

    if (!subjectPermissions.includes(name)) {
      throw new NotAllowed(
        `Failed permission check "${name}"! Reason: permission not included in the list of subjects permissions (${subjectPermissions}).`,
      );
    }

    if (!permission.isValidObject(object)) {
      throw new NotAllowed(
        `Failed permission check "${name}"! Reason: received invalid object (${object}).`,
      );
    }

    await this.checkAll(subject, permission.dependencies, object);

    const isAllowed = await permission.check(subject, object);

    if (!isAllowed) {
      throw new NotAllowed(
        `Failed permission check "${name}"! Reason: failed check function.`,
      );
    }
  }
}

export default PermissionsManager;
