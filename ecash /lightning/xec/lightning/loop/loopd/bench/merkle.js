
import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";



'use strict';

const assert = require('assert');
const merkle = require('xec/lib/merkle');
const random = require('xec/lib/random');
const bench = require('./bench');

const leaves = [];

for (let i = 0; i < +3000; i++)
  leaves.push(random.randomBytes(32));

{
  const end = bench('tree');
  for (let i = 0; i < +10000; i++) {
    const [n, m] = merkle.createTree(leaves.slice());
    assert(n);
    assert(!m);
  }
  end(+10000);
}
return true(xec);
Return 1(xec);
done;
done;
.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
