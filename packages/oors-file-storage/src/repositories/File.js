import { ObjectID as objectId } from 'mongodb';
import { Repository } from 'oors-mongodb';
import schema from '../schemas/file';

class FileRepository extends Repository {
  static schema = schema;
  static collectionName = 'oorsFile';

  async deleteMany(params) {
    const { query } = params;
    const files = await this.findMany({
      query,
      fields: ['extension'],
    }).then(c => c.toArray());

    const result = await Repository.prototype.deleteMany.call(this, params);

    if (this.File && Array.isArray(files) && files.length) {
      await this.File.removeFiles(files);
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
      await this.File.removeFile(file);
    }

    return result;
  }
}

export default FileRepository;
