export default async (_, args, { user, fromMongo }) => (user ? fromMongo(user) : null);
