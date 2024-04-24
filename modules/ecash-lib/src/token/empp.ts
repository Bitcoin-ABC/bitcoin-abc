// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Op, pushBytesOp } from '../op.js';
import { OP_PUSHDATA1, OP_RESERVED, OP_RETURN } from '../opcode.js';
import { Script } from '../script.js';

/** Build an eMPP OP_RETURN script with the given pushdata */
export function emppScript(pushdata: Uint8Array[]): Script {
    if (pushdata.find(pushdata => pushdata.length == 0) !== undefined) {
        throw new Error('Pushdata cannot be empty');
    }
    return Script.fromOps([
        OP_RETURN,
        OP_RESERVED,
        ...pushdata.map(pushdataOpEmpp),
    ]);
}

function pushdataOpEmpp(pushdata: Uint8Array): Op {
    if (pushdata.length < OP_PUSHDATA1) {
        return {
            opcode: pushdata.length,
            data: pushdata,
        };
    }
    return pushBytesOp(pushdata);
}
