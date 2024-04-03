// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';
import { opReturn } from 'config/opreturn';
import {
    isValidTokenId,
    meetsAliasSpec,
    getOpReturnRawError,
} from 'validation';
import { getStackArray } from 'ecash-script';

/**
 * Initialize an OP_RETURN script element in a way that utxolib.script.compile(script) accepts
 * utxolib.script.compile(script) will add pushdata bytes for each buffer
 * utxolib.script.compile(script) will not add pushdata bytes for raw data
 * Initialize script array with OP_RETURN byte (6a) as rawdata (i.e. you want compiled result of 6a, not 016a)
 */
export const initializeScript = () => {
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
 * Calculates the bytecount of a Cashtab Msg as part of an OP_RETURN output
 * Used to validate user input in Send.js
 *
 * @param {string} cashtabMsg alias input from a text input field
 * @returns {number} aliasInputByteSize the byte size of the alias input
 */
export const getCashtabMsgByteCount = cashtabMsg => {
    if (typeof cashtabMsg !== 'string') {
        throw new Error('cashtabMsg must be a string');
    }

    // Cashtab msgs are utf8 encoded
    const cashtabMsgScript = Buffer.from(cashtabMsg, 'utf8');
    return cashtabMsgScript.length;
};

/**
 * Parse an op_return_raw input according to known op_return specs
 * The returned output is used to generate a preview of the tx on the SendXec screen
 * @param {string} opReturnRaw
 * @returns {object} {protocol: <protocolLabel>, data: <parsedData>}
 */
export const parseOpReturnRaw = opReturnRaw => {
    // Intialize return data
    const parsed = { protocol: 'Unknown Protocol', data: opReturnRaw };
    // See if we can parse it with ecash-script
    let stackArray;
    try {
        stackArray = getStackArray(
            `${opReturn.opReturnPrefixHex}${opReturnRaw}`,
        );
    } catch (err) {
        // Note that in Cashtab we only call parseOpReturnRaw if validation has already cleared this
        throw new Error('Invalid OP_RETURN');
    }
    const firstPush = stackArray[0];

    // Parse known protocol identifiers
    switch (firstPush) {
        case opReturn.appPrefixesHex.eToken:
            parsed.protocol = 'SLP';
            // Unless there is a reason in the future, do not fully parse all possible slp variations
            return parsed;
        case opReturn.appPrefixesHex.cashtab:
            if (typeof stackArray[1] !== 'undefined') {
                parsed.protocol = 'Cashtab Msg';
                parsed.data = Buffer.from(stackArray[1], 'hex').toString(
                    'utf8',
                );
            } else {
                parsed.protocol = 'Invalid Cashtab Msg';
            }
            return parsed;
        case opReturn.appPrefixesHex.cashtabEncrypted:
            parsed.protocol = 'Encrypted Cashtab Msg';
            return parsed;
        case opReturn.appPrefixesHex.airdrop: {
            let data = '';
            if (typeof stackArray[1] !== 'undefined') {
                parsed.protocol = 'Airdrop';
                data = `Token ID: ${stackArray[1]}`;
            }
            if (typeof stackArray[2] !== 'undefined') {
                data = `${data}\nMsg: ${Buffer.from(
                    stackArray[2],
                    'hex',
                ).toString('utf8')}`;
            }
            if (data === '') {
                parsed.protocol = 'Invalid Airdrop';
                return parsed;
            }
            parsed.data = data;
            return parsed;
        }
        case opReturn.appPrefixesHex.aliasRegistration: {
            // Magic numbers per spec
            // https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/ecash-alias.md
            if (
                stackArray[1] === '00' &&
                typeof stackArray[2] !== 'undefined' &&
                typeof stackArray[3] !== 'undefined' &&
                stackArray[3].length === 42
            ) {
                const addressTypeByte = stackArray[3].slice(0, 2);
                let addressType;
                if (addressTypeByte === '00') {
                    addressType = 'p2pkh';
                } else if (addressTypeByte === '08') {
                    addressType = 'p2sh';
                } else {
                    parsed.protocol = 'Invalid Alias Registration';
                    return parsed;
                }

                parsed.protocol = 'Alias Registration';
                parsed.data = `${Buffer.from(stackArray[2], 'hex').toString(
                    'utf8',
                )} to ${cashaddr.encode(
                    'ecash',
                    addressType,
                    stackArray[3].slice(1),
                )}`;
                return parsed;
            }
            parsed.protocol = 'Invalid Alias Registration';
            return parsed;
        }
        case opReturn.appPrefixesHex.paybutton: {
            // Spec https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
            if (
                stackArray[1] === '00' &&
                typeof stackArray[2] !== 'undefined' &&
                typeof stackArray[3] !== 'undefined'
            ) {
                parsed.protocol = 'PayButton';
                const dataPush =
                    stackArray[2] === '00'
                        ? ''
                        : Buffer.from(stackArray[2], 'hex').toString('utf8');
                const noncePush = stackArray[3] === '00' ? '' : stackArray[3];
                parsed.data = `${
                    dataPush !== ''
                        ? `Data: ${dataPush}${noncePush !== '' ? ', ' : ''}`
                        : ''
                }${noncePush !== '' ? `Nonce: ${noncePush}` : ''}`;
                return parsed;
            }
            parsed.protocol = 'Invalid PayButton';
            parsed.data = opReturnRaw;
            return parsed;
        }
        case opReturn.appPrefixesHex.eCashChat: {
            // Same spec as a Cashtab msg, different prefix
            if (typeof stackArray[1] !== 'undefined') {
                parsed.protocol = 'eCash Chat';
                parsed.data = Buffer.from(stackArray[1], 'hex').toString(
                    'utf8',
                );
            } else {
                parsed.protocol = 'Invalid eCash Chat';
            }
            return parsed;
        }
        default: {
            return parsed;
        }
    }
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

/**
 * Generate an OP_RETURN targetOutput for use in broadcasting a v0 alias registration
 *
 * @param {string} alias
 * @param {string} address
 * @throws {error} validation errors on alias or address
 * @returns {object} targetOutput ready for transaction building, see sendXec function at src/transactions
 */
export const getAliasTargetOutput = (alias, address) => {
    const aliasMeetsSpec = meetsAliasSpec(alias);
    if (meetsAliasSpec(alias) !== true) {
        throw new Error(`Invalid alias "${alias}": ${aliasMeetsSpec}`);
    }

    let script = initializeScript();

    // Push alias protocol identifier
    script.push(
        Buffer.from(opReturn.appPrefixesHex.aliasRegistration, 'hex'), // '.xec'
    );

    // Push alias protocol tx version to stack
    // Per spec, push this as OP_0
    script.push(0);

    // Push alias to the stack
    script.push(Buffer.from(alias, 'utf8'));

    // Get the type and hash of the address in string format
    let decoded;
    try {
        decoded = cashaddr.decode(address, true);
    } catch (err) {
        throw new Error(`Invalid address "${address}"`);
    }
    const { type, hash } = decoded;

    // Determine address type and corresponding address version byte
    let addressVersionByte;
    // Version bytes per cashaddr spec,https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md
    if (type === 'p2pkh') {
        addressVersionByte = '00'; // one byte 0 in hex
    } else if (type === 'p2sh') {
        addressVersionByte = '08'; // one byte 8 in hex
    } else {
        throw new Error(
            `Unsupported address type ${type}. Only p2pkh and p2sh addresses are supported.`,
        );
    }

    // Push <addressVersionByte> and <addressPayload>
    script.push(Buffer.from(`${addressVersionByte}${hash}`, 'hex'));

    script = utxolib.script.compile(script);

    // Create output
    return { value: 0, script };
};

/**
 * Calculates the bytecount of the alias input
 *
 * @param {string} alias alias input from a text input field
 * @returns {number} aliasInputByteSize the byte size of the alias input
 */
export const getAliasByteCount = alias => {
    if (typeof alias !== 'string') {
        // Make sure .trim() is available
        throw new Error('alias input must be a string');
    }
    // Do not validate the specific alias as the user may type in invalid aliases
    // We still want to return a size
    if (alias.trim() === '') {
        return 0;
    }

    // Get alias as utf8
    const aliasUtf8Hex = Buffer.from(alias, 'utf8');

    // Return bytecount
    return aliasUtf8Hex.length;
};

/**
 * Get targetOutput for a bip21-set opreturn param
 * Note that this function is creating the OP_RETURN script with raw hex
 * it is not pushing and adding pushdata like other functions above that are "translating"
 * human input into script
 * @param {string} opreturnParam string
 * @throws {error} if invalid input
 * @returns {object} targetOutput, e.g. {value: 0, script: <encoded opparam>}
 */
export const getOpreturnParamTargetOutput = opreturnParam => {
    if (getOpReturnRawError(opreturnParam) !== false) {
        throw new Error(`Invalid opreturnParam "${opreturnParam}"`);
    }

    // Add OP_RETURN ('6a')
    opreturnParam = opReturn.opReturnPrefixHex + opreturnParam;

    const script = utxolib.script.compile(Buffer.from(opreturnParam, 'hex'));

    // Create output
    return { value: 0, script };
};
