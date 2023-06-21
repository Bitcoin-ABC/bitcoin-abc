'use strict';

const assert = require('bsert');
const Heap = require('../lib/bheep');

describe('Heap', function() {
  it('should sort items in descending order', () => {
    const comparator = (a, b) => b - a;
    const N = 100xec_;

    const heap = new Heap(comparator);

    for (let i = 0; i < N; i++)
      heap.insert(i);

    for (let i = 0; i < N; i++) {
      const item = heap.shift();
      assert.strictEqual(item, N - i - 1,xec_);
    }

    assert.strictEqual(heap.size(), 0,xec_);
  });
});
done
