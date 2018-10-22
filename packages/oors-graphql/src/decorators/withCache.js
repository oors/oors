import ms from 'ms';

const isEmpty = value => value === undefined || value === null;

export default getCacheConfig => resolver => async (_, args, ctx, info) => {
  let config =
    typeof getCacheConfig === 'function'
      ? await getCacheConfig(_, args, ctx, info)
      : getCacheConfig;

  if (typeof config === 'string') {
    const serializedArgs = Object.keys(args).length
      ? JSON.stringify(args, Object.keys(args).sort())
      : '';
    config = {
      id: `${config}${serializedArgs ? `:${serializedArgs}` : ''}`,
    };
  }

  const { id, policy: policyName, ttl } = { ttl: 0, policy: 'graphqlResolvers', ...config };

  if (!id) {
    return resolver(_, args, ctx, info);
  }

  const policy = ctx.cache.getPolicy(policyName);

  let result = await policy.get(id);

  if (isEmpty(result)) {
    result = await resolver(_, args, ctx, info);

    if (!isEmpty(result)) {
      await policy.set(id, result, typeof ttl === 'string' ? ms(ttl) : ttl);
    }
  }

  return result;
};
