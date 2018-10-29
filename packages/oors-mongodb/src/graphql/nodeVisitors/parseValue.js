export default (fieldName, parser) => node => {
  const isMatcher =
    typeof fieldName === 'function' ? fieldName(node.fieldName) : node.fieldName === fieldName;

  if (isMatcher) {
    Object.assign(node, {
      value: parser(node.value),
    });
  }
};
