`oors-security` provides a permissions-based authorization mechanism.

If you're looking for a simpler but restrictive system, and you know up-front what are the available groups of users and the access to resources is decided only by the presence of users in these groups and no logic is involved, `oors-user` alone is a solution for dealing with authorization.

You should use `oors-security` if:

- you intend to provide some administrative access to the groups (probably through a UI), where you want to add new groups, manage groups' permissions, organize users into groups;
- you need more granularity over the way you assign permissions to users (sometimes you just want to assign some permissions to a specific user, without having to create a group for that)
- you don't know up-front what are the groups of users (roles) of the system and you want to be able to let the admin manage that as he gets a better understanding of it; this way you just apply the restrictions to some resources using permissions, but you let the admin organize permissions into groups and assign users to groups;
- you want visibility over what a user can do - you can just get the list of permissions assigned to it, which is a merge between directly assigned permissions and permissions related to the groups the user is a part of. The role-based system is opaque - you don't know what a role can do, unless properly documented.
- you want to have logic involved in the decision making process; example: a user can add comments to a blog post, but he can only update them unless he's the creator of a comment and the comment hasn't been posted more than an hour ago.

The workflow behind `oors-security` is the following:

### 1. Identifying the resources.

A resource can be pretty much anything:

- a path (`/admin`, `/products/123`)
- a function call
- a business object
- etc.

Figuring out what are the things (resources) which require a restricted access will be an on-going process.

### 2. Applying restrictions to these resources.

Once you identified the resources you can apply labels (permissions) to these, like `products.delete`, `isAdmin`, `sendEmail`.
It's up to you to choose a permission name that makes sense, `oors-security` doesn't impose any restrictions to that.

You might want to associate logic to that, for example - a user can `drive.car` only if he's over 18 and he has a driving license. In this case the fact that the user has the permission is not enough, he needs to pass the test associated with it.

### 3. Assigning permissions to users.

These associations are stored in the database, and thanks to that you can handle that through a UI a (super)admin can interact with.

Often times you'll find yourself replicating the same set of permissions to multiple users. That's when you'll have to create groups, assign those permissions to the groups and then add users to the groups.

---

Let's get into some code examples.

The key component when defining permissions is called PermissionsManager. An instance of it is created automatically in the `oors-security` module.

This is how you can define a new permission:

```js
permissionManager.define('articles.create', {
  description: 'Can create new articles',
});
permissionManager.define('admin'); // admin area access - the description is not required, since one like `Admin permission definition` will be generated automatically
```

You check the permissions availability on a subject (usually a user):

```js
const user = {
  permissions: ['admin'],
};

permissionsManager.can(user, 'admin').then(result => {
  assert(result); // will pass
});
```

The test above passes because the user has the `admin` permission.

Let's add a permission that has some associated logic:

```js
permissionManager.define('drink', {
  description: 'can drink alcohol',
  check: subject => subject.age > 18,
});

const user = {
  permissions: ['drink'],
  age: 30,
};

permissionsManager
  .can(user, 'drink')
  .then(result => {
    assert(result); // result will be "true"
  })
  .catch(console.log);
```

And one that will fail:

```js
permissionsManager.define('drive', {
  description: 'can drive a car',
  check: subject => subject.age > 18 && subject.hasDrivingLicense,
});

const user = {
  permissions: ['drive'],
  age: 30,
  hasDrivingLicense: false,
};

permissionsManager
  .can(user, 'drive')
  .then(result => {
    assert(result); // it will fail (the result will be "false") because the user doesn't have a driving license
  })
  .catch(console.log);
```

There's another function you can use to test the permissions:

```js
// for the example above
permissionsManager.check(user, 'drive').catch(console.log); // this time an error will be thrown with a message saying the check function failed
```

You use `can` when you're only interested in whether the user passed the test or not, and you use `check` when you want to see what triggered the fail.

You can also express dependencies between permissions:

```js
permissionManager.define('products.manage', {
  description: 'Can Create / Read / Update / Delete products.',
  dependencies: ['admin'],
});
```

When we check for `products.manage` the presence of the `admin` permission will be checked first.

You can express multiple dependencies and they will be checked in parallel.

```js
permissionManager.define('doSomething', {
  description: 'I want to do something about it!',
  dependencies: ['dep1', 'dep2', 'dep3'], // will be executed in parallel
});
```

But there might be cases where a dependency check is expensive and you want to test for the others only IF the first one passes.
For that you can nest arrays and the dependencies will be checked in series:

```js
permissionManager.define('doSomething', {
  description: 'I want to do something about it!',
  dependencies: [['dep1', 'dep2'], 'dep3'],
});
```

In the example above "dep1" and "dep2" will be executed in series ("dep1" will be first), but they will be executed in parallel with "dep3".

Let's look at a more complex example:

```js
permissionManager.define('doSomething', {
  description: 'I want to do something about it!',
  dependencies: [[['dep1', 'dep2'], 'dep3'], 'dep4'],
});
```

- "dep1" and "dep2" will execute in parallel
- once "dep1" and "dep2" will finish, "dep3" will run
- all the ops above will be executed in paralle with "dep4".

Also, keep in mind that once one of them fails, everything will fail.

Another use case is when you want to test the permissions on a specific object. For example, when you want to check if a user is able to update a specific article (only if he is the author of the article), or if a user can delete a comment (he's either an admin, or he created the comment less than an hour ago).

Let's see these examples in practice.

First, the one about updating articles:

```js
permissionsManager.define('articles.update', {
  check: (user, article) => user.id === article.authorId,
});

const user = {
  permissions: ['articles.update'],
  id: 10,
};

const article = {
  title: 'hello, world!',
  authorId: 10,
};

permissionsManager.check(user, 'articles.update', article).catch(console.log); // no errors
```

And the one about deleting comments:

```js
permissionsManager.define('comments.delete', {
  check: async (user, comment) => {
    try {
      await permissionsManager.check('admin');
      return true; // if he's an admin, he's good to go
    } catch (err) {
      // we don't care about the errors here
    }

    if (user.id !== comment.authorId) {
      // checking if he's the author
      return false;
    }

    return Date.now() - comment.createdAtTS < 1000 * 60 * 60; // created less than an hour ago
  },
});

const user = {
  permissions: ['comments.delete'],
  id: 10,
};

const comment = {
  body: 'hello, world!',
  authorId: 10,
  createdAtTS: Date.now() - 1000 * 60 * 23, // 23 mins ago
};

permissionsManager.check(user, 'comments.delete', comment).catch(console.log); // will pass the test
```

You can also validate the object you're running the checks onto.

For example, for the scenarios above, you might want to check if the article has an authorId. Here's how to do it:

```js
permissionsManager.define('articles.update', {
  check: (user, article) => user.id === article.authorId,
  validateObject: article => !!article.authorId,
});
```

`validateObject` is a function that will receive the object as the only parameter and has to return a boolean result.

---

Now let's see how wen can use what we've learned so far in the context of oors.
