import path from 'path';
import fs from 'fs-extra';

class File {
  constructor({ uploadDir, FileRepository, validateUpload }) {
    this.uploadDir = uploadDir;
    this.FileRepository = FileRepository;
    this.validateUpload = validateUpload;
  }

  removeFiles(files) {
    return Promise.all(files.map(file => this.removeFile(file)));
  }

  removeFile(file) {
    return fs.unlink(this.getPath({ file }));
  }

  async createFromUpload(initialData) {
    const data = this.validateUpload(initialData);

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
