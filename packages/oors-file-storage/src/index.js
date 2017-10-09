import Joi from 'joi';
import { Module } from 'oors';
import FileService from './services/File';
import FileRepositoryService from './services/FileRepository';
import router from './router';
import uploadMiddleware from './middlewares/upload';

class FileStorage extends Module {
  static configSchema = {
    uploadDir: Joi.string().required(),
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
    const [{ registerServices }, { bindRepository }] = await this.dependencies([
      'oors.octobus',
      'oors.mongoDb',
    ]);

    const services = registerServices(this, {
      File: new FileService({
        uploadDir: this.getConfig('uploadDir'),
      }),
      FileRepository: bindRepository(new FileRepositoryService()),
    });

    this.export(services);
  }
}

export default FileStorage;
