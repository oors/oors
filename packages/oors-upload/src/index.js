import { validate, validators as v } from 'easevalidation';
import { Module } from 'oors';
import File from './services/File';
import router from './router';
import createUploadMiddleware from './middlewares/createUploadMiddleware';

class UploadModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      uploadDir: [v.isRequired(), v.isString()],
    }),
  );

  static defaultConfig = {
    'oors.rad': {
      autoload: {
        services: false,
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
      validateUpload: validate(
        v.isSchema({
          originalname: [v.isRequired(), v.isString()],
          path: [v.isRequired(), v.isString()],
          size: [v.isRequired(), v.isNumber()],
          mimetype: [v.isRequired(), v.isString()],
          destination: v.isAny(v.isUndefined(), v.isString()),
        }),
      ),
    });

    FileRepository.File = fileService;

    this.export({
      File: fileService,
    });
  }
}

export default UploadModule;
