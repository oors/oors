import { Module } from 'oors';
import File from './services/File';
import FileRepository from './repositories/File';
import router from './router';
import uploadMiddleware from './middlewares/upload';

class FileStorage extends Module {
  static configSchema = {
    type: 'object',
    properties: {
      uploadDir: {
        type: 'string',
      },
    },
    required: ['uploadDir'],
  };

  name = 'oors.fileStorage';

  initialize({ uploadDir }) {
    this.uploadMiddleware = uploadMiddleware({
      dest: uploadDir,
    });

    this.router = router({
      uploadMiddleware: this.uploadMiddleware,
    });
  }

  async setup() {
    const [{ bindRepository }] = await this.dependencies(['oors.mongoDb']);

    const fileRepository = bindRepository(new FileRepository());
    const file = new File({
      uploadDir: this.getConfig('uploadDir'),
      FileRepository: fileRepository,
    });
    fileRepository.File = file;

    this.export({
      File: file,
      FileRepository: fileRepository,
    });
  }
}

export default FileStorage;
