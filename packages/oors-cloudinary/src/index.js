import { validate, validators as v } from 'easevalidation';
import { promisify } from 'util';
import snakeCase from 'lodash/snakeCase';
import { Module } from 'oors';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { helpers } from 'oors-express';
import MulterStorage from './MulterStorage';

const objToSnakeCase = obj =>
  Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      [snakeCase(key)]: obj[key],
    }),
    {},
  );

class CloudinaryModule extends Module {
  static validateConfig = validate(
    v.isSchema({
      config: [
        v.isRequired(),
        v.isSchema({
          cloudName: [v.isRequired(), v.isString()],
          apiKey: [v.isRequired(), v.isString()],
          apiSecret: [v.isRequired(), v.isString()],
        }),
      ],
    }),
  );

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
        [method]: promisify(
          this.cloudinary.v2.uploader[snakeCase(method)].bind(this.cloudinary.v2.uploader),
        ),
      }),
      {},
    );

    this.uploader.uploadStream = (stream, options = {}) =>
      new Promise((resolve, reject) => {
        stream.pipe(
          this.cloudinary.v2.uploader.upload_stream(options, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }),
        );
      });

    this.exportProperties([
      'cloudinary',
      'uploader',
      'upload',
      'rename',
      'remove',
      'manageTags',
      'createMulterStorage',
    ]);
  }

  upload = (file, { stream, ...options } = {}) =>
    this.uploader[stream ? 'uploadStream' : 'upload'](file, objToSnakeCase(options));

  rename = (fromPublicId, toPublicId, options = {}) =>
    this.uploader.rename(fromPublicId, toPublicId, objToSnakeCase(options));

  remove = (publicId, options = {}) => this.uploader.destroy(publicId, options);

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

  createMulterStorage = (options = {}) =>
    new MulterStorage({
      ...options,
      cloudinary: this,
    });

  createUploadMiddleware = (id, params = {}) =>
    helpers.createMiddleware({
      id,
      factory: multer,
    })({
      storage: this.createMulterStorage(),
      ...params,
    });
}

export default CloudinaryModule;
