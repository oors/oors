oors-mongodb is a oors module providing MongoDB integration.

The main features of this module are:

- `Store` - a class wrapper of a MongoDB collection
- `Repository` - an extension of a Store that can be bound to a MongoDB connection.
- `Seeder` - loading seed data
- data migration
- GraphQL (oors.graphql) integration: out of the box CRUD experience similar to what Prisma offers

Features of a repository:

- can validate the data according to a predefined JSON schema.
- can have relations pointing to other repositories; this helps with joins ($lookup)
- provides utilty classes to simplify running bulk operations, working with the aggregation pipeline framework, an setting up mongodb change streams
