import Ajv from 'ajv';
import path from 'path';
import fs from 'fs-extra';
import ValidationError from 'oors/build/errors/ValidationError';

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  async: 'es7',
  useDefaults: true,
});

const validateUploadData = ajv.compile({
  type: 'object',
  properties: {
    filename: {
      type: 'string',
    },
    path: {
      type: 'string',
    },
    size: {
      type: 'number',
    },
    mimeType: {
      type: 'string',
    },
    uploadDir: {
      type: 'string',
    },
    meta: {
      type: 'object',
    },
  },
  required: ['filename', 'path', 'size', 'mimeType'],
});

class File {
  constructor({ uploadDir, FileRepository }) {
    this.uploadDir = uploadDir;
    this.FileRepository = FileRepository;
  }

  async createFromUpload(data) {
    if (!validateUploadData(data)) {
      throw new ValidationError(validateUploadData.errors);
    }

    const { path: uploadPath, filename, size, mimeType, uploadDir } = data;

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
