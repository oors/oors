class MulterStorage {
  constructor({ cloudinary, uploadOptions = {}, removeOptions = {} }) {
    this.cloudinary = cloudinary;
    this.uploadOptions = uploadOptions;
    this.removeOptions = removeOptions;
  }

  async _handleFile(req, file, cb) {
    try {
      const result = await this.cloudinary.upload(file.stream, {
        ...this.uploadOptions,
        stream: true,
      });

      cb(null, result);
    } catch (error) {
      cb(error);
    }
  }

  async _removeFile(req, file, cb) {
    try {
      const result = await this.cloudinary.remove(file.public_id, this.removeOptions);

      cb(null, result);
    } catch (error) {
      cb(error);
    }
  }
}

export default MulterStorage;
