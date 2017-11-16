import { withArgs } from 'oors-graphql/build/decorators';

export const withUserStamps = withArgs(({ input, id, ...restArgs }, { user }) => ({
  input: {
    ...input,
    [id ? 'updatedBy' : 'createdBy']: user._id,
  },
  ...(restArgs || {}),
}));
