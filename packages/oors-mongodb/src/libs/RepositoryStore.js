import set from 'lodash/set';
import get from 'lodash/get';
import has from 'lodash/has';
import invariant from 'invariant';
import Repository from './Repository';

class RepositoryStore {
  constructor(module) {
    this.repositories = {};
    this.module = module;
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
      getRelations: () => this.module.get('relations')[repository.collectionName],
    });

    repository.configure({
      getRepository: this.get,
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

    set(this.repositories, payload.key, this.bind(payload.repository, options.connectionName));

    return this.get(payload.key);
  };

  get = key => {
    if (!has(this.repositories, key)) {
      throw new Error(`Unable to find "${key}" repository!`);
    }

    return get(this.repositories, key);
  };
}

export default RepositoryStore;
