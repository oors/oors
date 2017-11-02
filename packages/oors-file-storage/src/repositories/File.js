import fs from 'fs-extra';
import { ObjectID as objectId } from 'mongodb';
import { Repository } from 'oors-mongodb';

class FileRepository extends Repository {
  static schema = {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
      },
      mimeType: {
        type: 'string',
      },
      extension: {
        type: 'string',
      },
      size: {
        type: 'number',
      },
      uploadedAt: {
        instanceof: 'Date',
      },
      meta: {
        type: 'object',
        default: {},
      },
    },
    required: ['filename', 'mimeType', 'extension', 'size'],
  };

  static collectionName = 'oorsFile';

  async deleteMany(params) {
    const { query } = params;
    const files = await this.findMany({
      query,
      fields: ['extension'],
    }).then(c => c.toArray());

    const result = await Repository.prototype.deleteMany.call(this, params);

    if (this.File && Array.isArray(files) && files.length) {
      await Promise.all(files.map(file => fs.unlink(this.File.getPath({ file }))));
    }

    return result;
  }

  async deleteOne(params) {
    let file;

    if (params instanceof objectId) {
      file = await this.findById(params);
    } else {
      file = await this.findOne({ query: params.query });
    }

    const result = await Repository.prototype.deleteOne.call(this, params);

    if (this.File && file) {
      await fs.unlink(this.File.getPath(file));
    }

    return result;
  }
}

export default FileRepository;
