export const requiresRole = role => (_, args, ctx, info, next) => {
  const { user } = ctx;
  if (!user || !Array.isArray(user.roles) || !user.roles.includes(role)) {
    return null;
  }
  return next(...args);
};

export const requiresAuth = () => (_, args, ctx, info, next) => {
  const { user } = ctx;
  if (!user) {
    return null;
  }
  return next(...args);
};
