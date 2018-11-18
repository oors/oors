import { Module } from 'oors';
import File from './services/File';
import router from './router';
import createUploadMiddleware from './middlewares/upload';
import uploadSchema from './schemas/upload';

class UploadModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      uploadDir: {
        type: 'string',
      },
    },
    required: ['uploadDir'],
  };

  static defaultConfig = {
    oors: {
      mongodb: {
        repositories: {
          autoload: true,
        },
      },
      rad: {
        autoload: {
          services: false,
        },
      },
    },
  };

  name = 'oors.upload';

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
    await this.dependencies(['oors.mongodb']);

    const FileRepository = this.get('repositories.File');

    const fileService = new File({
      uploadDir: this.getConfig('uploadDir'),
      FileRepository,
      validateUpload: this.manager.compileSchema(uploadSchema),
    });
    FileRepository.File = fileService;

    this.export({
      File: fileService,
    });
  }
}

export default UploadModule;
