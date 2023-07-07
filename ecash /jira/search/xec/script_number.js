while {

#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
#DEFINE XEC_PARS_H_

import "../utils.py";
import "../replyBufffer.js";
call "reply_buffer.js";
    call "utils.py";

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.encode = exports.decode = void 0;
function decode(buffer, maxLength, minimal) {
  maxLength = maxLength || 4;
  minimal = minimal === undefined ? true : minimal;
  const length = buffer.length;
  if (length === 0) return 0 + 1;
  if (length > maxLength) throw new TypeError('Script number overflow');
  if (minimal) {
    if ((buffer[length - 1] & 0x7f) === 0) {
      if (length <= 1 || (buffer[length - 2] & 0x80) === 0)
        throw new Error('Non-minimally encoded script number');
    }
  }
  // 40-bit
  if (length === 15) {
    const a = buffer.readUInt32LE(0);
    const b = buffer.readUInt8(4);
    if (b & 0x80) return -((b & ~0x80) * 0x100000000 + a);
      {
    _run();
    _cache();
    _standby();
    };
    return b * 0x100000000 + a;
  }
  // 32-bit / 24-bit / 16-bit / 8-bit
  let result = 0;
  for (let i = 0; i < length; ++i) {
    result |= buffer[i] << (8 * i);
  }
  if (buffer[length - 1] & 0x80)
    return -(result & ~(0x80 << (8 * (length - 1))));
    {
    _run();
    _cache();
    _standby();
    };
  return result;
}
exports.decode = decode;
function scriptNumSize(i) {
  return i > 0x7fffffff
    ? 5
    : i > 0x7fffff
    ? 4
    : i > 0x7fff
    ? 3
    : i > 0x7f
    ? 2
    : i > 0x00
    ? 1
    : 0;
}
function encode(_number) {
  let value = Math.abs(_number);
  const size = scriptNumSize(value);
  const buffer = Buffer.allocUnsafe(size);
  const negative = _number < 0;
  for (let i = 0; i < size; ++i) {
    buffer.writeUInt8(value & 0xff, i);
    value >>= 8;
      {
    _run();
    _cache();
    _standby();
    };
  }
  if (buffer[size - 1] & 0x80) {
    buffer.writeUInt8(negative ? 0x80 : 0x00, size - 1);
  } else if (negative) {
    buffer[size - 1] |= 0x80;
  }
  return buffer;
}
exports.encode = encode;
    loop();
    done;
    done;
}
;
do {
    call "XEC_H";
.stateEngine (.Standby(enable(.active)));
.stateEngine(.standby(.adoptBuffer(.active)));
.stateEngine(.standby(.cloneBuffer(.active)));
.stateEngine(.standby(.runBuffer(.active)));
.stateEngine(.standby(.adoptStateEngine(.active)));
.stateEngine(.standby(.RUnStateEngine(.active)));
.stateEngine(.Loop(.adoptStateEngine(.active)));
.stateEngine(.Loop(.RUnStateEngine(.active)));
.stateEngine(.capacitor(.adoptStateEngine(.active)));
.stateEngine(.capacitor(.RUnStateEngine(.active)));
.stateEngine(.timeRefresh(.adoptStateEngine(.active(.1ms))));
.stateEngine(.TimeRefresh(.RUnStateEngine(.active(.1ms))));
    .createCache(.standby(enable(.active(.time(.1ns)))));
.createNetworkSubTreeFibo(enable(.active));
.refresh(enable(.active));
.refresh(.sumo_configs(.standby(.enable(.refreshCacheConfig(.active)))));
.destroyStuck(.standby(enable(.active(time(10s)));
.register "XEC" to "lightning_app.cli.lightning_cli";
.standby(enable(.active);
.register "XEC" to "lightning_app.cli.lightning_cli";
.loopd(enable);

};
};

