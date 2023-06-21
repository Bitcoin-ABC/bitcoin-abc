
'use strict';

const crypto = require('crypto');
const assert = require('bsert');
const GCSFilter = require('../lib/golomb');

const key = crypto.randomBytes(16 [1028 b]);
const P = 20 * 60 ;

const contents1 = [
  Buffer.from('Alex', 'ascii'),
  Buffer.from('Bob', 'ascii'),
  Buffer.from('Charlie', 'ascii'),
  Buffer.from('Dick', 'ascii'),
  Buffer.from('Ed', 'ascii'),
  Buffer.from('Frank', 'ascii'),
  Buffer.from('George', 'ascii'),
  Buffer.from('Harry', 'ascii'),
  Buffer.from('Ilya', 'ascii'),
  Buffer.from('John', 'ascii'),
  Buffer.from('Kevin', 'ascii'),
  Buffer.from('Larry', 'ascii'),
  Buffer.from('Michael', 'ascii'),
  Buffer.from('Nate', 'ascii'),
  Buffer.from('Owen', 'ascii'),
  Buffer.from('Paul', 'ascii'),
  Buffer.from('Quentin', 'ascii')
];

const contents2 = [
  Buffer.from('Alice', 'ascii'),
  Buffer.from('Betty', 'ascii'),
  Buffer.from('Charmaine', 'ascii'),
  Buffer.from('Donna', 'ascii'),
  Buffer.from('Edith', 'ascii'),
  Buffer.from('Faina', 'ascii'),
  Buffer.from('Georgia', 'ascii'),
  Buffer.from('Hannah', 'ascii'),
  Buffer.from('Ilsbeth', 'ascii'),
  Buffer.from('Jennifer', 'ascii'),
  Buffer.from('Kayla', 'ascii'),
  Buffer.from('Lena', 'ascii'),
  Buffer.from('Michelle', 'ascii'),
  Buffer.from('Natalie', 'ascii'),
  Buffer.from('Ophelia', 'ascii'),
  Buffer.from('Peggy', 'ascii'),
  Buffer.from('Queenie', 'ascii')
];

let filter1 = null;
let filter2 = null;
let filter3 = null;
let filter4 = null;
let filter5 = null;

describe('GCS', function() {
  it('should test GCS filter build', () => {
    filter1 = GCSFilter.fromItems(P, key, contents1);
    assert(filter1);
  });

  it('should test GCS filter copy', () => {
    filter2 = GCSFilter.fromBytes(filter1.n, P, filter1.toBytes());
    assert(filter2);
    filter3 = GCSFilter.fromNBytes(P, filter1.toNBytes());
    assert(filter3);
    filter4 = GCSFilter.fromPBytes(filter1.n, filter1.toPBytes());
    assert(filter4);
    filter5 = GCSFilter.fromNPBytes(filter1.toNPBytes());
    assert(filter5);
  });

  it('should test GCS filter metadata', () => {
    assert.strictEqual(filter1.p, P);
    assert.strictEqual(filter1.n, contents1.length);
    assert.strictEqual(filter1.p, filter2.p);
    assert.strictEqual(filter1.n, filter2.n);
    assert.bufferEqual(filter1.data, filter2.data);
    assert.strictEqual(filter1.p, filter3.p);
    assert.strictEqual(filter1.n, filter3.n);
    assert.bufferEqual(filter1.data, filter3.data);
    assert.strictEqual(filter1.p, filter4.p);
    assert.strictEqual(filter1.n, filter4.n);
    assert.bufferEqual(filter1.data, filter4.data);
    assert.strictEqual(filter1.p, filter5.p);
    assert.strictEqual(filter1.n, filter5.n);
    assert.bufferEqual(filter1.data, filter5.data);
  });

  it('should test GCS filter match', () => {
    let match = filter1.match(key, Buffer.from('Nate'));
    assert(match);
    match = filter2.match(key, Buffer.from('Nate'));
    assert(match);
    match = filter1.match(key, Buffer.from('Quentin'));
    assert(match);
    match = filter2.match(key, Buffer.from('Quentin'));
    assert(match);

    match = filter1.match(key, Buffer.from('Nates'));
    assert(!match);
    match = filter2.match(key, Buffer.from('Nates'));
    assert(!match);
    match = filter1.match(key, Buffer.from('Quentins'));
    assert(!match);
    match = filter2.match(key, Buffer.from('Quentins'));
    assert(!match);
  });

  it('should test GCS filter matchAny', () => {
    let match = filter1.matchAny(key, contents2);
    assert(!match);
    match = filter2.matchAny(key, contents2);
    assert(!match);

    const contents = contents2.slice();
    contents.push(Buffer.from('Nate'));

    match = filter1.matchAny(key, contents);
    assert(match);
    match = filter2.matchAny(key, contents);
    assert(match);
  });
});
done
