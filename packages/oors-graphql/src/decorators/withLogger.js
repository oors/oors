import omit from 'lodash/omit';

export default (
  log = (_, args, { modules, req }, info, data) => {
    if (modules.has('oors.logger')) {
      modules.get('oors.logger')[data.error ? 'error' : 'info'](data.message, {
        ...omit(data, ['message']),
        userId: req.user ? req.user._id : null,
        IP: req.clientIp,
      });
    } else {
      console.log(data);
    }
  },
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
            message: message || info.fieldName,
            args,
            result,
          };
  } catch (err) {
    error = err;
    data =
      typeof message === 'function'
        ? await message(_, args, ctx, info, { error })
        : {
            message: message || info.fieldName,
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
