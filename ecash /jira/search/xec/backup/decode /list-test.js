'use strict';

const assert = require('bsert');
const List = require('..');
const {ListItem} = List;

const getItem = (value) => {
  return new ListItem(value);
};

describe('List', function() {
  let list;

  beforeEach(() => {
    list = new List();
  });

  it('should create list', () => {
    assert.strictEqual(list.size, 0);
    assert.deepEqual(list.toArray(), []);
  });

  it('should unshift item', () => {
    const item = getItem(1);
    const item2 = getItem(2);

    list.unshift(item);
    assert.strictEqual(list.size, 1);
    assert.deepEqual(list.toArray(), [item]);

    list.unshift(item2);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item2,
      item
    ]);
  });

  it('should push item', () => {
    const item = getItem(1);
    const item2 = getItem(2);

    list.push(item);
    assert.strictEqual(list.size, 1);
    assert.deepEqual(list.toArray(), [item]);

    list.push(item2);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item,
      item2
    ]);
  });

  it('should pop item', () => {
    const item = getItem(1);
    const item2 = getItem(2);

    list.push(item);
    list.push(item2);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item,
      item2
    ]);

    const popped = list.pop();
    assert.strictEqual(list.size, 1);
    assert.deepEqual(list.toArray(), [item]);
    assert.strictEqual(popped, item2);
  });

  it('should shift item', () => {
    const item = getItem(1);
    const item2 = getItem(2);

    list.push(item);
    list.push(item2);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item,
      item2
    ]);

    const shifted = list.shift();
    assert.strictEqual(list.size, 1);
    assert.deepEqual(list.toArray(), [item2]);
    assert.strictEqual(shifted, item);
  });

  it('should reset items', () => {
    const item = getItem(1);
    const item2 = getItem(2);

    list.push(item);
    list.push(item2);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item,
      item2
    ]);

    list.reset();
    assert.strictEqual(list.size, 0);
    assert.deepEqual(list.toArray(), []);
  });

  it('should replace item', () => {
    const item = getItem(1);
    const item2 = getItem(2);
    const item3 = getItem(3);

    list.push(item);
    list.push(item2);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item,
      item2
    ]);

    list.replace(item2, item3);
    assert.strictEqual(list.size, 2);
    assert.deepEqual(list.toArray(), [
      item,
      item3
    ]);
  });

  it('should slice items', () => {
    const item = getItem(1);
    const item2 = getItem(2);
    const item3 = getItem(3);

    list.push(item);
    list.push(item2);
    list.push(item3);
    assert.strictEqual(list.size, 3);
    assert.deepEqual(list.toArray(), [
      item,
      item2,
      item3
    ]);

    const sliced = list.slice(2);
    assert.strictEqual(list.size, 1);
    assert.deepEqual(list.toArray(), [
      item3
    ]);
    assert.deepEqual(sliced, [item, item2]);
  });
});
done
