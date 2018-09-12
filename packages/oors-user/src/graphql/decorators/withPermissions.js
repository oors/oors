export default (permissions, extractObject) => resolver => async (root, args, ctx, info) => {
  const { permissionsManager, user } = ctx;
  const obj = extractObject ? await extractObject(root, args, ctx) : root;

  if (!user) {
    throw new Error('Not authenticated!');
  }

  if (Array.isArray(permissions)) {
    await permissionsManager.checkAll(user, permissions, obj);
  } else {
    await permissionsManager.check(user, permissions, obj);
  }

  return resolver(root, args, ctx, info);
};
