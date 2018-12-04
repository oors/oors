import { validators as v } from 'easevalidation';
import { createOne } from '../../../../../../../../packages/oors-mongodb/build/graphql/createResolvers';
import { compose, withArgs } from '../../../../../../../../packages/oors-graphql/build/decorators';
import PostRepository from '../../../repositories/Post';
import withValidator from '../../../../../../../../packages/oors-graphql/build/decorators/withValidator';
import isObjectId from '../../../../../../../../packages/oors-mongodb/build/libs/isObjectId';

export default compose(
  withValidator(
    v.isSchema({
      input: v.isSchema({
        status: [v.isString(), v.isOneOf(PostRepository.statuses)],
        categoryId: v.isAny(v.isUndefined(), isObjectId()),
      }),
    }),
  ),
  withArgs((_, { input, id }, { user, loaders }, info, { resolve }) => ({
    input: {
      ...input,
      [id ? 'updatedBy' : 'createdBy']: user._id, // user stamps
    },
    // if we have a categoryId, we need to make sure it points to an existing database entry
    category: input.categoryId
      ? resolve(loaders.oorsBlogCategories.findById.load(input.categoryId))
      : null,
  })),
  withValidator((_, { input: { categoryId } }) => v.isSchema({
    category: [...(categoryId ? [v.isRequired()] : []), v.isAny(v.isObject(), v.isUndefined())],
  })),
)(
  createOne({
    repositoryName: 'oors.blog.Post',
  }),
);
