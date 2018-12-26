export default resolver => (root, args, ctx, info) => {
  if (root && root[info.fieldName] !== undefined) {
    return root[info.fieldName];
  }

  return resolver(root, args, ctx, info);
};
