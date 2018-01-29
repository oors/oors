import { Module } from 'oors';
import File from './services/File';
import FileRepository from './repositories/File';
import router from './router';
import createUploadMiddleware from './middlewares/upload';
import uploadSchema from './schemas/upload';

class FileStorage extends Module {
  static schema = {
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
    const uploadMiddleware = createUploadMiddleware({
      dest: uploadDir,
    });

    this.router = router({
      uploadMiddleware,
    });

    this.export({
      uploadMiddleware,
    });
  }

  async setup() {
    const [{ addRepository }] = await this.dependencies(['oors.mongoDb']);

    const fileRepository = addRepository('File', new FileRepository());
    const fileService = new File({
      uploadDir: this.getConfig('uploadDir'),
      FileRepository: fileRepository,
      validateUpload: this.manager.compileSchema(uploadSchema),
    });
    fileRepository.File = fileService;

    this.export({
      File: fileService,
      FileRepository: fileRepository,
    });
  }
}

export default FileStorage;
