// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { encodeCashAddress } from 'ecashaddrjs';
import { opReturn } from 'config/opreturn';
import { isValidTokenId, getOpReturnRawError } from 'validation';
import { getStackArray } from 'ecash-script';
import { Script, pushBytesOp, OP_RETURN, fromHex, TxOutput } from 'ecash-lib';
import { AddressType } from 'ecashaddrjs/dist/types';

/**
 * Get targetOutput for a Cashtab Msg from user input string
 * @param cashtabMsg string
 * @throws if msg exceeds opReturnByteLimit of 223 or invalid input
 * @returns targetOutput, e.g. {value: 0, script: <encoded cashtab msg>}
 */
export const getCashtabMsgTargetOutput = (cashtabMsg: string): TxOutput => {
    if (typeof cashtabMsg !== 'string') {
        throw new Error('getCashtabMsgTargetOutput requires string input');
    }
    if (cashtabMsg === '') {
        throw new Error('Cashtab Msg cannot be an empty string');
    }
    // Cashtab msgs are utf8 encoded
    const cashtabMsgScript = Buffer.from(cashtabMsg, 'utf8');
    const cashtabMsgByteCount = cashtabMsgScript.length;

    if (cashtabMsgByteCount > opReturn.cashtabMsgByteLimit) {
        throw new Error(
            `Error: Cashtab msg is ${cashtabMsgByteCount} bytes. Exceeds ${opReturn.cashtabMsgByteLimit} byte limit.`,
        );
    }

    const script = Script.fromOps([
        OP_RETURN,
        // LOKAD
        pushBytesOp(Buffer.from(opReturn.appPrefixesHex.cashtab, 'hex')),
        // utf8-encoded msg
        pushBytesOp(cashtabMsgScript),
    ]);

    // Create output
    return { value: 0, script };
};

/**
 * Calculates the bytecount of a Cashtab Msg as part of an OP_RETURN output
 * Used to validate user input in Send.js
 *
 * @param cashtabMsg alias input from a text input field
 * @returns aliasInputByteSize the byte size of the alias input
 */
export const getCashtabMsgByteCount = (cashtabMsg: string): number => {
    if (typeof cashtabMsg !== 'string') {
        throw new Error('cashtabMsg must be a string');
    }

    // Cashtab msgs are utf8 encoded
    const cashtabMsgScript = Buffer.from(cashtabMsg, 'utf8');
    return cashtabMsgScript.length;
};

export interface ParsedOpReturnRaw {
    protocol: string;
    data: string;
}
/**
 * Parse an op_return_raw input according to known op_return specs
 * The returned output is used to generate a preview of the tx on the SendXec screen
 * @param opReturnRaw
 * @returns {object} {protocol: <protocolLabel>, data: <parsedData>}
 */
export const parseOpReturnRaw = (opReturnRaw: string): ParsedOpReturnRaw => {
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
                )} to ${encodeCashAddress(
                    'ecash',
                    addressType as AddressType,
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
 * @param tokenId tokenId of the token receiving this airdrop tx
 * @param airdropMsg optional brief msg accompanying the airdrop
 * @throws if msg exceeds opReturnByteLimit of 223 or invalid input
 * @returns targetOutput, e.g. {value: 0, script: <encoded airdrop msg>}
 */
export const getAirdropTargetOutput = (
    tokenId: string,
    airdropMsg = '',
): TxOutput => {
    if (!isValidTokenId(tokenId)) {
        throw new Error(`Invalid tokenId: ${tokenId}`);
    }
    if (typeof airdropMsg !== 'string') {
        throw new Error(
            'getAirdropTargetOutput requires string input for tokenId and airdropMsg',
        );
    }
    const scriptArray = [
        OP_RETURN,
        // LOKAD
        pushBytesOp(Buffer.from(opReturn.appPrefixesHex.airdrop, 'hex')),
        pushBytesOp(fromHex(tokenId)),
    ];

    if (airdropMsg.trim() !== '') {
        // Cashtab msgs are utf8 encoded
        const airdropMsgScript = Buffer.from(airdropMsg, 'utf8');
        const airdropMsgByteCount = airdropMsgScript.length;

        if (airdropMsgByteCount > opReturn.airdropMsgByteLimit) {
            throw new Error(
                `Error: Airdrop msg is ${airdropMsgByteCount} bytes. Exceeds ${opReturn.airdropMsgByteLimit} byte limit.`,
            );
        }
        scriptArray.push(pushBytesOp(airdropMsgScript));
    }

    const script = Script.fromOps(scriptArray);

    // Create output
    return { value: 0, script };
};

/**
 * Get targetOutput for a bip21-set opreturn param
 * Note that this function is creating the OP_RETURN script with raw hex
 * it is not pushing and adding pushdata like other functions above that are "translating"
 * human input into script
 * @param opreturnParam string
 * @throws if invalid input
 * @returns targetOutput, e.g. {value: 0, script: <encoded opparam>}
 */
export const getOpreturnParamTargetOutput = (
    opreturnParam: string,
): TxOutput => {
    if (getOpReturnRawError(opreturnParam) !== false) {
        throw new Error(`Invalid opreturnParam "${opreturnParam}"`);
    }

    // Note this is a "weird" function that translates op_return_raw input per bip21 spec
    // We are adding the expected OP_RETURN code to the beginning of our param
    // And we are converting the whole thing to ecash-lib "Script" type
    // Unlike other functions we are not building an output from multiple pushes
    const script = new Script(
        fromHex(opReturn.opReturnPrefixHex + opreturnParam),
    );

    // Create output
    return { value: 0, script };
};
