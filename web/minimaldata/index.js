var OPS = require('bitcoin-ops');
var pushData = require('pushdata-bitcoin');

// https://github.com/bitcoin/bitcoin/blob/master/src/script/script.h#L22
var MAX_SCRIPT_ELEMENT_SIZE = 520;

// https://github.com/bitcoin/bitcoin/blob/d612837814020ae832499d18e6ee5eb919a87907/src/script/interpreter.cpp#L209
function checkMinimalPush(opcode, data) {
    // Could have used OP_0.
    if (data.length === 0) {
        return opcode === OPS.OP_0;

        // Could have used OP_1 .. OP_16.
    } else if (data.length === 1 && data[0] >= 1 && data[0] <= 16) {
        return opcode === OPS.OP_1 + (opcode - 1);

        // Could have used OP_1NEGATE.
    } else if (data.length === 1 && opcode === 0x81) {
        return opcode === OPS.OP_1NEGATE;

        // Could have used a direct push (opcode indicating number of bytes pushed + those bytes).
    } else if (data.length <= 75) {
        return opcode === data.length;

        // Could have used OP_PUSHDATA1.
    } else if (data.length <= 255) {
        return opcode === OPS.OP_PUSHDATA1;

        // Could have used OP_PUSHDATA2.
    } else if (data.length <= 65535) {
        return opcode === OPS.OP_PUSHDATA2;
    }

    return false;
}

// https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki
module.exports = function bip62(buffer) {
    var i = 0;

    while (i < buffer.length) {
        var opcode = buffer[i];

        // is this a data PUSH?
        if (opcode >= 0 && opcode <= OPS.OP_PUSHDATA4) {
            var d = pushData.decode(buffer, i);

            // did reading a pushDataInt fail? empty script
            if (d === null) return false;
            i += d.size;

            // attempt to read too much data? empty script
            if (i + d.number > buffer.length) return false;

            var data = buffer.slice(i, i + d.number);
            i += d.number;

            if (d.number > MAX_SCRIPT_ELEMENT_SIZE) return false;
            if (!checkMinimalPush(opcode, data)) return false;

            // opcode
        } else {
            ++i;
        }
    }

    return true;
};
