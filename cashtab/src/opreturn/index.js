// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as utxolib from '@bitgo/utxo-lib';
import { opReturn } from 'config/opreturn';
import { isValidTokenId } from 'utils/validation';

/**
 * Initialize an OP_RETURN script element in a way that utxolib.script.compile(script) accepts
 * utxolib.script.compile(script) will add pushdata bytes for each buffer
 * utxolib.script.compile(script) will not add pushdata bytes for raw data
 * Initialize script array with OP_RETURN byte (6a) as rawdata (i.e. you want compiled result of 6a, not 016a)
 */
const initializeScript = () => {
    return [opReturn.opReturnPrefixDec];
};

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

    let script = initializeScript();

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

/**
 * Get targetOutput for an Airdrop tx OP_RETURN from token id and optional user message
 * Airdrop tx spec: <Airdrop Protocol Identifier> <tokenId> <optionalMsg>
 * @param {string} tokenId tokenId of the token receiving this airdrop tx
 * @param {string} airdropMsg optional brief msg accompanying the airdrop
 * @throws {error} if msg exceeds opReturnByteLimit of 223 or invalid input
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded airdrop msg>}
 */
export const getAirdropTargetOutput = (tokenId, airdropMsg = '') => {
    if (!isValidTokenId(tokenId)) {
        throw new Error(`Invalid tokenId: ${tokenId}`);
    }
    if (typeof airdropMsg !== 'string') {
        throw new Error(
            'getAirdropTargetOutput requires string input for tokenId and airdropMsg',
        );
    }

    let script = initializeScript();

    // Push Airdrop protocol identifier
    script.push(Buffer.from(opReturn.appPrefixesHex.airdrop, 'hex'));

    // add the airdrop token ID to script
    script.push(Buffer.from(tokenId, 'hex'));

    if (airdropMsg.trim() !== '') {
        // Cashtab msgs are utf8 encoded
        const airdropMsgScript = Buffer.from(airdropMsg, 'utf8');
        const airdropMsgByteCount = airdropMsgScript.length;

        if (airdropMsgByteCount > opReturn.airdropMsgByteLimit) {
            throw new Error(
                `Error: Airdrop msg is ${airdropMsgByteCount} bytes. Exceeds ${opReturn.airdropMsgByteLimit} byte limit.`,
            );
        }

        script.push(airdropMsgScript);
    }

    script = utxolib.script.compile(script);

    // Create output
    return { value: 0, script };
};
