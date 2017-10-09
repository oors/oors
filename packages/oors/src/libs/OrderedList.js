import Joi from 'joi';
import findIndex from 'lodash/findIndex';
import filter from 'lodash/filter';
import reject from 'lodash/reject';
import find from 'lodash/find';

const findIndexById = (list, id) => {
  const index = findIndex(list, { id });
  if (index === -1) {
    throw new Error(`Unable to find item with id "${id}"!`);
  }
  return index;
};

class List extends Array {
  insert(pivot, ...items) {
    if (typeof pivot === 'string') {
      return this.insertAfter(pivot, ...items);
    }

    Joi.attempt(pivot, {
      before: Joi.string(),
      after: Joi.string(),
    });

    if (pivot.before) {
      return this.insertBefore(pivot.before, ...items);
    }

    if (pivot.after) {
      return this.insertAfter(pivot.after, ...items);
    }

    throw new Error(`Invalid pivot format: ${pivot}!`);
  }

  insertAfter(pivotId, ...items) {
    const index = findIndexById(this, pivotId);
    this.splice(index + 1, 0, ...items);
    return this;
  }

  insertBefore(pivotId, ...items) {
    const index = findIndexById(this, pivotId);
    this.splice(index, 0, ...items);
    return this;
  }

  remove(itemId) {
    const index = findIndexById(this, itemId);
    this.splice(index, 1);
    return this;
  }

  filter(predicate) {
    return filter(this, predicate);
  }

  reject(predicate) {
    return reject(this, predicate);
  }

  find(id) {
    return find(this, { id });
  }

  move(id, pivot) {
    if (pivot.before) {
      return this.moveBefore(id, pivot);
    }

    if (pivot.after) {
      return this.moveAfter(id, pivot);
    }

    throw new Error(`Invalid pivot format: ${pivot}!`);
  }

  moveBefore(id, pivotId) {
    const index = findIndexById(this, id);
    const item = this[index];
    this.remove(id);
    this.insertBefore(pivotId, item);
    return this;
  }

  moveAfter(id, pivotId) {
    const index = findIndexById(this, id);
    const item = this[index];
    this.remove(id);
    this.insertAfter(pivotId, item);
    return this;
  }
}

export default List;
