export default (fieldName, newName = fieldName) => node => {
  if (node.fieldName === fieldName) {
    Object.assign(node, {
      value: !node.value,
      fieldName: newName,
    });
  }
};
