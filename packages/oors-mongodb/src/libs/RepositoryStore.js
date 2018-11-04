import invariant from 'invariant';
import Repository from './Repository';

class RepositoryStore {
  constructor(module) {
    this.module = module;
    this.repositories = {};
  }

  create = ({ methods = {}, connectionName, ...options }) => {
    const repository = new Repository(options);

    Object.keys(methods).forEach(methodName => {
      repository[methodName] = methods[methodName].bind(repository);
    });

    this.bind(repository, connectionName);

    return repository;
  };

  bind = (repository, connectionName) => {
    if (Array.isArray(repository)) {
      return repository.map(repo => this.bind(repo, connectionName));
    }

    invariant(
      repository.collectionName,
      `Missing repository collection name - ${repository.constructor.name}!`,
    );

    Object.assign(repository, {
      collection: !repository.hasCollection()
        ? this.module.getConnectionDb(connectionName).collection(repository.collectionName)
        : repository.collection,
      ajv: this.module.ajv,
      validate:
        repository.validate ||
        (repository.schema ? this.module.ajv.compile(repository.schema) : () => true),
      getRepository: this.get,
      relationToLookup: (name, options = {}) => ({
        ...this.module.get('relationToLookup')(repository.collectionName, name),
        ...options,
      }),
      getRelation: name => this.module.get('relations')[repository.collectionName][name],
      hasRelation: name =>
        this.module.get('relations')[repository.collectionName][name] !== undefined,
    });

    return repository;
  };

  add = (key, repository, options = {}) => {
    const payload = {
      key,
      repository,
      options,
    };

    this.module.emit('repository', payload);

    this.repositories[payload.key] = this.bind(payload.repository, options.connectionName);

    return this.repositories[payload.key];
  };

  get = key => {
    if (!this.repositories[key]) {
      throw new Error(`Unable to find "${key}" repository!`);
    }

    return this.repositories[key];
  };

  configure(repositories = this.repositories) {
    Object.keys(repositories).forEach(key => {
      const repository = repositories[key];

      repository.configure({
        getRepository: this.get,
      });

      const relations = {
        ...(repository.constructor.relations || {}),
        ...(repository.relations || {}),
      };

      Object.keys(relations).forEach(relationName => {
        const { localField, foreignField, type, ...restOptions } = relations[relationName];
        this.module.get('addRelation')({
          from: {
            repository,
            field: localField,
            name: relationName,
          },
          to: {
            ...restOptions,
            field: foreignField,
          },
          type,
        });
      });
    });
  }
}

export default RepositoryStore;
