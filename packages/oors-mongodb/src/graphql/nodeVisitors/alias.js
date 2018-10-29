export default (alias, fieldName) => node => {
  if (node.fieldName === fieldName) {
    Object.assign(node, {
      fieldName: alias,
    });
  }
};
