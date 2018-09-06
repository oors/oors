import withContext from 'oors-graphql/build/decorators/withContext';

export default repositories =>
  withContext((_, args, ctx) => ({
    ...ctx,
    ...repositories.reduce(
      (acc, repository) => ({
        ...acc,
        [`${repository}Repository`]: ctx.getRepository(repository),
      }),
      {},
    ),
  }));
