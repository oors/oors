import path from 'path';
import fs from 'fs-extra';
import ValidationError from 'oors/build/errors/ValidationError';

class File {
  constructor({ uploadDir, FileRepository, validateUpload }) {
    this.uploadDir = uploadDir;
    this.FileRepository = FileRepository;
    this.validateUpload = validateUpload;
  }

  async createFromUpload(data) {
    if (!this.validateUpload(data)) {
      throw new ValidationError(this.validateUpload.errors);
    }

    const {
      path: uploadPath,
      originalname: filename,
      size,
      mimetype: mimeType,
      destination: uploadDir,
    } = data;

    const file = await this.FileRepository.createOne({
      filename: path.basename(filename),
      extension: path.extname(filename),
      size,
      mimeType,
      uploadedAt: new Date(),
    });

    const destination = this.getPath({ file, uploadDir });

    await fs.rename(uploadPath, destination);

    return file;
  }

  getPath({ file, uploadDir }) {
    return path.join(uploadDir || this.uploadDir, `${file._id}${file.extension}`);
  }
}

export default File;
