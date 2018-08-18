import { ObjectID as objectId } from 'mongodb';

export default {
  Query: {
    allTasks: async (_, args, { app, fromMongoCursor }) => fromMongoCursor(await app.modules.get('todo').TaskRepository.findMany()),
    tasksByStatus: async (_, { checked }, { app, fromMongoCursor }) => fromMongoCursor(await app.modules.get('todo').TaskRepository.findChecked(checked)),
  },
  Mutation: {
    createTask: async (_, { input }, { app, fromMongo }) => fromMongo(await app.modules.get('todo').TaskRepository.createOne(input)),
    toggleTask: async (_, { id }, { app, fromMongo }) => {
      const { TaskRepository } = app.modules.get('todo');
      const task = await TaskRepository.findById(objectId(id));

      if (!task) {
        throw new Error('Not found!');
      }

      return fromMongo(
        await TaskRepository.updateOne({
          query: {
            _id: task._id,
          },
          update: {
            $set: {
              isChecked: !task.isChecked,
            },
          },
        }),
      );
    },
  },
};
