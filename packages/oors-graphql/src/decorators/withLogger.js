export default (
  log = (_, args, ctx, info, data) => console.log(data),
) => message => resolver => async (_, args, ctx, info) => {
  let data;
  let result;
  let error;

  try {
    result = await resolver(_, args, ctx, info);
    data =
      typeof message === 'function'
        ? await message(_, args, ctx, info, { result })
        : {
            message,
            args,
            result,
          };
  } catch (err) {
    error = err;
    data =
      typeof message === 'function'
        ? await message(_, args, ctx, info, { error })
        : {
            message,
            args,
            error,
          };
  }

  if (data) {
    log(_, args, ctx, info, data);
  }

  if (error) {
    throw error;
  }

  return result;
};
