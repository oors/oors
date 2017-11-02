/* eslint-disable no-underscore-dangle */
import { ObjectID as objectId } from 'mongodb';
import invariant from 'invariant';

class Store {
  static toId = id => objectId(id);

  constructor(collection) {
    this._collection = collection;
    this.id = '_id';
  }

  get collection() {
    invariant(this._collection, `${this.constructor.name} store missing collection!`);
    return this._collection;
  }

  set collection(collection) {
    this._collection = collection;
  }

  // eslint-disable-next-line class-methods-use-this
  parse(data) {
    return data;
  }

  query(fn) {
    invariant(
      fn && typeof fn === 'function',
      'Requires a function that will receive the collection!',
    );
    return fn(this.collection);
  }

  aggregate({ pipeline, options } = {}) {
    invariant(pipeline, 'Pipeline is required!');
    return this.collection.aggregate(pipeline, options);
  }

  findById(id) {
    invariant(id, 'Id is required!');
    return this.collection.findOne({ [this.id]: this.toId(id) });
  }

  findOne({ query = {}, options = {} } = {}) {
    return this.collection.findOne(query, options);
  }

  async findMany({ query = {}, orderBy, limit, skip, fields } = {}) {
    let selectedFields = fields;
    if (Array.isArray(fields)) {
      selectedFields = fields.reduce(
        (acc, field) => ({
          ...acc,
          [field]: 1,
        }),
        {},
      );
    }

    let cursor = await this.collection.find(query, selectedFields);

    if (orderBy) {
      cursor = cursor.sort(orderBy);
    }

    if (skip) {
      cursor = cursor.skip(skip);
    }

    if (limit) {
      cursor = cursor.limit(limit);
    }

    return cursor;
  }

  async createOne(data) {
    invariant(typeof data === 'object', 'Data is required!');
    const result = await this.collection.insertOne(await this.parse(data));
    return result.ops[0];
  }

  async createMany(data) {
    invariant(data && Array.isArray(data), 'Requires an array of items!');
    const result = await this.collection.insertMany(
      await Promise.all(data.map(this.parse.bind(this))),
    );
    return result.ops;
  }

  async updateOne({ query = {}, update, options = { returnOriginal: false } } = {}) {
    invariant(typeof update === 'object', 'Update payload is required!');
    const result = await this.collection.findOneAndUpdate(query, update, options);
    return result.value;
  }

  updateMany({ query = {}, update, options = {} } = {}) {
    invariant(typeof update === 'object', 'Update payload is required!');
    return this.collection.updateMany(query, update, options);
  }

  async replaceOne(query, data) {
    invariant(query, 'Query is required!');
    invariant(data, 'Data is required!');
    const { ops } = await this.collection.replaceOne(query, await this.parse(data));
    return ops[0];
  }

  async save(data) {
    return data[this.id]
      ? this.replaceOne({ [this.id]: this.toId(data[this.id]) }, data)
      : this.createOne(data);
  }

  async deleteOne(params) {
    const { query, options } = {
      query: {},
      options: {},
      ...params,
    };

    const result = await this.collection.findOneAndDelete(query, options);
    return result.value;
  }

  async deleteMany({ query = {}, options = {} } = {}) {
    return this.collection.deleteMany(query, options);
  }

  count({ query = {}, options = {} } = {}) {
    return this.collection.count(query, options);
  }

  toId(id) {
    return this.constructor.toId(id);
  }
}

export default Store;
