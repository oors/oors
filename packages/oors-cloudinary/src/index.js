import snakeCase from 'lodash/snakeCase';
import { Module } from 'oors';
import cloudinary from 'cloudinary';

const objToSnakeCase = obj =>
  Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      [snakeCase(key)]: obj[key],
    }),
    {},
  );

class CloudinaryModule extends Module {
  static schema = {
    type: 'object',
    properties: {
      config: {
        type: 'object',
        properties: {
          cloudName: {
            type: 'string',
          },
          apiKey: {
            type: 'string',
          },
          apiSecret: {
            type: 'string',
          },
        },
        required: ['cloudName', 'apiKey', 'apiSecret'],
      },
    },
    required: ['config'],
  };

  name = 'oors.cloudinary';

  async setup({ config }) {
    cloudinary.config(objToSnakeCase(config));

    this.cloudinary = cloudinary;

    this.uploader = [
      'upload',
      'rename',
      'destroy',
      'addTag',
      'removeTag',
      'removeAllTags',
      'replaceTag',
    ].reduce(
      (acc, method) => ({
        ...acc,
        [method]: (...args) =>
          new Promise((resolve, reject) =>
            this.cloudinary.v2.uploader[snakeCase(method)](...args, (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            }),
          ),
      }),
      {},
    );

    this.exportProperties(['cloudinary', 'uploader', 'upload', 'rename', 'remove', 'manageTags']);
  }

  upload = (file, options = {}) => this.uploader.upload(file, objToSnakeCase(options));

  rename = (fromPublicId, toPublicId, options = {}) =>
    this.uploader.rename(fromPublicId, toPublicId, objToSnakeCase(options));

  remove = publicId => this.uploader.destroy(publicId);

  manageTags = fn => {
    fn({
      add: (tag, publicIds, options = {}) =>
        this.uploader.addTag(tag, publicIds, objToSnakeCase(options)),
      remove: (tag, publicIds, options = {}) =>
        this.uploader.removeTag(tag, publicIds, objToSnakeCase(options)),
      removeAll: (publicIds, options = {}) =>
        this.uploader.removeAllTags(publicIds, objToSnakeCase(options)),
      replace: (tag, publicIds, options = {}) =>
        this.uploader.replaceTag(tag, publicIds, objToSnakeCase(options)),
    });
  };
}

export default CloudinaryModule;
