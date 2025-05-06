// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Op, isPushOp, pushBytesOp } from '../op.js';
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

/**
 * Parse a script for EMPP push(es)
 *
 * EMPP may encode multiple pushdatas in a single OP_RETURN script
 *
 * input script is a valid EMPP OP_RETURN    => returns an array of EMPP pushdata(s)
 * input script is not an EMPP OP_RETURN     => returns undefined
 * input script is an invalid EMPP OP_RETURN => throws
 */
export function parseEmppScript(script: Script): Uint8Array[] | undefined {
    const ops = script.ops();
    const opreturnOp = ops.next();
    if (
        opreturnOp === undefined ||
        isPushOp(opreturnOp) ||
        opreturnOp !== OP_RETURN
    ) {
        return undefined;
    }
    const opreservedOp = ops.next();
    if (
        opreservedOp === undefined ||
        isPushOp(opreservedOp) ||
        opreservedOp !== OP_RESERVED
    ) {
        return undefined;
    }
    const pushdata: Uint8Array[] = [];
    let op: Op | undefined = undefined;
    while ((op = ops.next()) !== undefined) {
        if (!isPushOp(op)) {
            throw new Error('eMPP allows only push ops');
        }
        if (op.data.length === 0) {
            throw new Error("eMPP doesn't allow empty pushdata");
        }
        pushdata.push(op.data);
    }
    return pushdata;
}
