export default (field, toMongo) => node => {
  if (node.field === field) {
    Object.assign(node, {
      toMongo: (...args) => toMongo(node.value, ...args),
    });
  }
};
