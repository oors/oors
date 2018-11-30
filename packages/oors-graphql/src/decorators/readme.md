GraphQL resolver decorators are high order functions that allow you to split responsibilites and
keep your resolver logic neatly organized.

To see what that means, let's assume we have a mutation to add a comment to a blog post.

```graphql
addComment(postId: ID!, body: String!, email: String!): Comment!
```

Let's say we have a solution like prisma or oors that can
[generate CRUD resolvers](https://github.com/oors/oors/blob/master/packages/oors-mongodb/src/libs/graphql.js#L36)
for you.

Then the resolver needs to deal with:

- input validation
  - we need to make sure the postId is a valid id of an actual post
  - the email has to be a valid email address
- map the arguments to a single "input" object because this is what our CRUD resolver can deal with
- notify the admin (or post author) about the comment

We can achieve all of the above with decorators:

```js
import { compose, withJSONSchema, withArgs, withWrapper } from 'oors-graphql/build/decorators';

const createCommentResolver = someFunctionThatWillAchieveThat;

export default compose(
  // JSON schema in here
  withJSONSchema({
    type: 'object',
    properties: {
      // we only validate what graphql can't handle
      postId: {
        // making sure this is a valid id
        isObjectId: true,
      },
      email: {
        type: 'string',
        format: 'email',
      },
    },
  }),
  withArgs((_, args, ctx, info, { resolve }) => ({
    // move all the arguments inside a input argument
    input: args,
    post: resolve(ctx.db.findPostById(args.postId)),
  })),
  withJSONSchema({
    type: 'object',
    properties: {
      // making sure the post was found in the database
      post: {
        type: 'object',
      },
    },
    required: ['post'],
  }),
  withWrapper(null, async (_, args, ctx, info, comment) => {
    // send email notification after the comment has been created
    await ctx.notifyAuthorThroughEmailABout(comment);
  }),
)(createCommentResolver);
```

You can find a list of the decorators oors comes bundled with
[here](https://github.com/oors/oors/tree/master/packages/oors-graphql/src/decorators) and you can
see some examples on how to use them in the
[blog example](https://github.com/oors/oors/tree/master/examples/blog/src/modules/Blog/graphql).

---

`withJSONSchema(argsSchema)` - validates the arguments against a specified JSON schema using
[ajv](https://github.com/epoberezkin/ajv).

`withArgs(argsTransformer)` - remaps the arguments to the result of `argsTransformer` function. The
signature of the function is `argsTransformer(root, args, ctx, info, { resolve })`. The 4th argument is
an optional object who's single property is a `resolve` function you can use to call promises.

While you can do something like this:

```js
withArgs(async (root, args, ctx) => {
  args.post = await ctx.findPostById(args.postId);
  delete args.notNeeded;
  return args;
});
```

This could be more readable and convenient:

```js
withArgs(root, { notNeeded, ...args }, ctx) => ({
  ...args,
  post: resolve(ctx.findPostById(args.postId))
}))
```
