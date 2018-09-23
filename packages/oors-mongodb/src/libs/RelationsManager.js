class RelationsManager {
  static RELATION_TYPE = {
    ONE: 'one',
    MANY: 'many',
  };

  constructor(module) {
    this.module = module;
    this.relations = {};
  }

  parseNode = node => ({
    ...node,
    collectionName:
      node.collectionName ||
      (node.repositoryName && this.module.getRepository(node.repositoryName).collectionName) ||
      (node.repository && node.repository.collectionName),
  });

  add = ({ type, inversedType, ...args }) => {
    const from = this.parseNode(args.from);
    const to = this.parseNode(args.to);

    if (!this.relations[from.collectionName]) {
      this.relations[from.collectionName] = {};
    }

    this.relations[from.collectionName][from.name] = {
      collectionName: to.collectionName,
      localField: from.field,
      foreignField: to.field,
      type,
    };

    if (inversedType && to.name) {
      this.add({
        from: to,
        to: from,
        type: inversedType,
      });
    }
  };

  toLookup = (collectionName, name) => ({
    from: this.relations[collectionName][name].collectionName,
    localField: this.relations[collectionName][name].localField,
    foreignField: this.relations[collectionName][name].foreignField,
    as: name,
  });
}

export default RelationsManager;
