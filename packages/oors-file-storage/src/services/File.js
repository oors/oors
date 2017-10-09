import Joi from 'joi';
import { decorators, ServiceContainer } from 'octobus.js';
import path from 'path';
import fs from 'fs-extra';

const { service, withSchema } = decorators;

class File extends ServiceContainer {
  constructor({ uploadDir }) {
    super();
    this.uploadDir = uploadDir;
  }

  setServiceBus(...args) {
    super.setServiceBus(...args);
    this.FileRepository = this.extract('FileRepository');
  }

  @service()
  @withSchema({
    filename: Joi.string().required(),
    path: Joi.string().required(),
    size: Joi.number().required(),
    mimeType: Joi.string().required(),
    uploadDir: Joi.string(),
    meta: Joi.object(),
  })
  async createFromUpload({
    path: uploadPath,
    filename,
    size,
    mimeType,
    uploadDir,
  }) {
    const file = await this.FileRepository.createOne({
      filename: path.basename(filename),
      extension: path.extname(filename),
      size,
      mimeType,
      uploadedAt: new Date(),
    });

    const destination = await this.getPath({ file, uploadDir });

    await fs.rename(uploadPath, destination);

    return file;
  }

  @service()
  getPath({ file, uploadDir }) {
    return path.join(
      uploadDir || this.uploadDir,
      `${file._id}${file.extension}`,
    );
  }
}

export default File;
