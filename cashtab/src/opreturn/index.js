// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as utxolib from '@bitgo/utxo-lib';
import { opReturn } from 'config/opreturn';

/**
 * Get targetOutput for a Cashtab Msg from user input string
 * @param {string} cashtabMsg string
 * @throws {error} if msg exceeds opReturnByteLimit of 223 or invalid input
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded cashtab msg>}
 */
export const getCashtabMsgTargetOutput = cashtabMsg => {
    if (typeof cashtabMsg !== 'string') {
        throw new Error('getCashtabMsgTargetOutput requires string input');
    }
    if (cashtabMsg === '') {
        throw new Error('Cashtab Msg cannot be an empty string');
    }
    // Note: utxolib.script.compile(script) will add pushdata bytes for each buffer
    // utxolib.script.compile(script) will not add pushdata bytes for raw data

    // Initialize script array with OP_RETURN byte (6a) as rawdata (i.e. you want compiled result of 6a, not 016a)
    let script = [opReturn.opReturnPrefixDec];

    // Push Cashtab Msg protocol identifier
    script.push(Buffer.from(opReturn.appPrefixesHex.cashtab, 'hex'));

    // Cashtab msgs are utf8 encoded
    const cashtabMsgScript = Buffer.from(cashtabMsg, 'utf8');
    const cashtabMsgByteCount = cashtabMsgScript.length;

    if (cashtabMsgByteCount > opReturn.cashtabMsgByteLimit) {
        throw new Error(
            `Error: Cashtab msg is ${cashtabMsgByteCount} bytes. Exceeds ${opReturn.cashtabMsgByteLimit} byte limit.`,
        );
    }

    script.push(cashtabMsgScript);

    script = utxolib.script.compile(script);

    // Create output
    return { value: 0, script };
};
