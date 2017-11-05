import Repository from '../../../../../../packages/oors-mongodb/src/Repository';

class TaskRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      title: {
        type: 'string',
      },
      isChecked: {
        type: 'boolean',
        default: false,
      },
    },
    required: ['title'],
  };

  findChecked(isChecked = true) {
    return this.findMany({
      query: {
        isChecked,
      },
    });
  }
}

export default TaskRepository;
