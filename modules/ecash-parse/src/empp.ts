// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { encodeBase58 } from 'b58-ts';
import { Bytes, bytesToStr, consume, fromHex } from 'ecash-lib';
import { opReturn } from './constants/opreturn';
import type { AppAction, UnknownAction, XecxAction } from './types';

export const getEmppAppActions = (stackArray: string[]): AppAction[] => {
    if (!Array.isArray(stackArray) || stackArray.length === 0) {
        throw new Error(
            'stackArray must be an array of OP_RETURN pushes with first entry OP_RESERVED',
        );
    }

    // Remove OP_RESERVED
    const emppIdentifier = stackArray[0];
    if (emppIdentifier !== opReturn.opReserved) {
        throw new Error('Not an EMPP stackArray');
    }

    const appActions: AppAction[] = [];

    // Note every element of stackArray after OP_RESERVED is an EMPP push
    // The .slice(1) removes OP_RESERVED so we are only dealing with complete EMPP pushes
    for (const push of stackArray.slice(1)) {
        const emppAction = getEmppAppAction(push);

        if (typeof emppAction !== 'undefined') {
            appActions.push(emppAction);
        }
    }

    return appActions;
};

export const getEmppAppAction = (push: string): AppAction | undefined => {
    const lokadBytes = 4;
    const emppStack = { remainingHex: push };
    const lokadId = consume(emppStack, lokadBytes);
    switch (lokadId) {
        case opReturn.appPrefixesHex.xecx: {
            const action = getXecxAppAction(emppStack);
            return {
                lokadId,
                app: 'XECX',
                isValid:
                    'minBalanceTokenSatoshisToReceivePaymentThisRound' in action
                        ? true
                        : false,
                action,
            };
        }
        case opReturn.appPrefixesHex.agora:
        case opReturn.appPrefixesHex.alp: {
            // Do not parse ALP as an app action, this will parsed by chronik as an indexed token tx
            // Do not parse AGORA as an app action, this is parsed elsewhere
            return;
        }
        case opReturn.appPrefixesHex.solAddr: {
            const VALID_SOL_ADDR_PUSH_LENGTH = 64;
            const isValid =
                emppStack.remainingHex.length === VALID_SOL_ADDR_PUSH_LENGTH;
            return {
                lokadId,
                app: 'Solana Address',
                isValid,
                action: {
                    solAddr: isValid
                        ? encodeBase58(fromHex(emppStack.remainingHex))
                        : `Invalid SOL pk: ${emppStack.remainingHex}`,
                },
            };
        }
        case opReturn.appPrefixesHex.cashtab: {
            // EMPP Cashtab msg: lokad (4 bytes) + UTF-8 encoded message
            // After consuming lokad, remainingHex is the UTF-8 encoded message
            const msgBytes = fromHex(emppStack.remainingHex);
            const isValid = msgBytes.length > 0;
            return {
                lokadId,
                app: 'Cashtab Msg',
                isValid,
                action: {
                    msg: isValid ? bytesToStr(msgBytes) : 'Invalid Cashtab msg',
                },
            };
        }
        case opReturn.appPrefixesHex.paybutton: {
            // PayButton EMPP push: lokad (4 bytes) + version (1 byte) + data + nonce
            // PayButton v0 spec: https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/paybutton.md
            const paybuttonStack = { remainingHex: emppStack.remainingHex };

            // Version byte (should be 00 for v0)
            const version = consume(paybuttonStack, 1);
            const SUPPORTED_VERSION = '00';

            if (version !== SUPPORTED_VERSION) {
                return {
                    lokadId,
                    app: 'PayButton',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: `Unsupported PayButton version: 0x${version}`,
                    },
                };
            }

            // Parse data push
            // First byte is the length of data (or 00 for empty)
            const dataLengthHex = consume(paybuttonStack, 1);
            const dataLength = parseInt(dataLengthHex, 16);
            let dataPush = '';

            if (dataLength === 0) {
                // Empty data
                dataPush = '';
            } else if (
                dataLength > 0 &&
                paybuttonStack.remainingHex.length >= dataLength * 2
            ) {
                // Read data bytes
                const dataHex = consume(paybuttonStack, dataLength);
                dataPush = bytesToStr(fromHex(dataHex));
            } else {
                // Invalid data length
                return {
                    lokadId,
                    app: 'PayButton',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: 'Invalid PayButton data length',
                    },
                };
            }

            // Parse nonce (8 bytes or 00 for empty)
            let noncePush = '';
            if (paybuttonStack.remainingHex.length >= 2) {
                const nonceLengthHex = consume(paybuttonStack, 1);
                const nonceLength = parseInt(nonceLengthHex, 16);

                if (nonceLength === 0) {
                    // Empty nonce
                    noncePush = '';
                } else if (
                    nonceLength === 8 &&
                    paybuttonStack.remainingHex.length >= 16
                ) {
                    // Read 8-byte nonce
                    noncePush = consume(paybuttonStack, 8);
                } else {
                    // Invalid nonce
                    return {
                        lokadId,
                        app: 'PayButton',
                        isValid: false,
                        action: {
                            stack: push,
                            decoded: 'Invalid PayButton nonce',
                        },
                    };
                }
            }

            // Valid PayButton
            return {
                lokadId,
                app: 'PayButton',
                isValid: true,
                action: {
                    data: dataPush,
                    nonce: noncePush,
                },
            };
        }
        case opReturn.appPrefixesHex.dice: {
            // DICE bet EMPP push: lokad (4 bytes) + version (1 byte) + minValue (u32, 4 bytes) + maxValue (u32, 4 bytes)
            const diceStack = { remainingHex: emppStack.remainingHex };

            // Version byte (should be 00 for v0)
            const version = consume(diceStack, 1);
            const SUPPORTED_VERSION = '00';

            if (version !== SUPPORTED_VERSION) {
                return {
                    lokadId,
                    app: 'DICE Bet',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: `Unsupported DICE version: 0x${version}`,
                    },
                };
            }

            // Need at least 8 bytes (4 for minValue + 4 for maxValue)
            if (diceStack.remainingHex.length < 16) {
                return {
                    lokadId,
                    app: 'DICE Bet',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: 'Invalid DICE bet data length',
                    },
                };
            }

            // Read minValue (u32, 4 bytes, little-endian)
            const minValueBytes = fromHex(consume(diceStack, 4));
            const minValue = new Bytes(minValueBytes).readU32();

            // Read maxValue (u32, 4 bytes, little-endian)
            const maxValueBytes = fromHex(consume(diceStack, 4));
            const maxValue = new Bytes(maxValueBytes).readU32();

            // Validate values (0 is excluded, range is [1, 100000000])
            const MAX_ROLL_VALUE = 100_000_000;
            const isValid =
                minValue >= 1 &&
                minValue <= MAX_ROLL_VALUE &&
                maxValue >= 1 &&
                maxValue <= MAX_ROLL_VALUE &&
                maxValue >= minValue;

            return {
                lokadId,
                app: 'DICE Bet',
                isValid,
                action: {
                    minValue,
                    maxValue,
                },
            };
        }
        case opReturn.appPrefixesHex.roll: {
            // ROLL payout EMPP push: lokad (4 bytes) + version (1 byte) + betTxid (32 bytes) + roll (u32, 4 bytes) + seedHash (32 bytes) + result (1 byte UTF-8)
            const rollStack = { remainingHex: emppStack.remainingHex };

            // Version byte (should be 00 for v0)
            const version = consume(rollStack, 1);
            const SUPPORTED_VERSION = '00';

            if (version !== SUPPORTED_VERSION) {
                return {
                    lokadId,
                    app: 'ROLL Payout',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: `Unsupported ROLL version: 0x${version}`,
                    },
                };
            }

            // Need at least 73 bytes (32 + 4 + 32 + 1 = 69 bytes after version)
            if (rollStack.remainingHex.length < 138) {
                return {
                    lokadId,
                    app: 'ROLL Payout',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: 'Invalid ROLL payout data length',
                    },
                };
            }

            // Read betTxid (32 bytes)
            const betTxid = consume(rollStack, 32);

            // Read roll (u32, 4 bytes, little-endian)
            const rollBytes = fromHex(consume(rollStack, 4));
            const roll = new Bytes(rollBytes).readU32();

            // Read seedHash (32 bytes)
            const seedHash = consume(rollStack, 32);

            // Read result (1 byte, UTF-8)
            const resultByte = fromHex(consume(rollStack, 1));
            const result = bytesToStr(resultByte);

            const isValid = ['W', 'L', 'I'].includes(result);

            return {
                lokadId,
                app: 'ROLL Payout',
                isValid,
                action: {
                    betTxid,
                    roll,
                    seedHash,
                    result,
                },
            };
        }
        case opReturn.appPrefixesHex.trophy: {
            // EDJ.com game payout: lokad (4 bytes) + numTxs (u32 LE) + potAtoms (u64 LE) + winnerOddsBps (u32 LE) + winnerTxid (32 bytes)
            const trophyStack = { remainingHex: emppStack.remainingHex };
            const TROPHY_DATA_LEN = 4 + 8 + 4 + 32; // 48 bytes = 96 hex chars

            if (trophyStack.remainingHex.length < TROPHY_DATA_LEN * 2) {
                return {
                    lokadId,
                    app: 'EDJ.com Payout',
                    isValid: false,
                    action: {
                        stack: push,
                        decoded: 'Invalid trophy data length',
                    },
                };
            }

            const numTxs = new Bytes(
                fromHex(consume(trophyStack, 4)),
            ).readU32();
            const potAtoms = new Bytes(
                fromHex(consume(trophyStack, 8)),
            ).readU64();
            const winnerOddsBps = new Bytes(
                fromHex(consume(trophyStack, 4)),
            ).readU32();
            const winnerTxid = consume(trophyStack, 32);

            const isValid =
                winnerOddsBps <= 10000 &&
                numTxs >= 1 &&
                potAtoms >= 0n &&
                winnerTxid.length === 64;

            return {
                lokadId,
                app: 'EDJ.com Payout',
                isValid,
                action: {
                    numTxs,
                    potAtoms,
                    winnerOddsBps,
                    winnerTxid,
                },
            };
        }
        default: {
            // Unknown EMPP action
            return {
                lokadId,
                app: 'unknown',
                action: {
                    stack: push,
                    decoded: bytesToStr(fromHex(push)),
                },
            };
        }
    }
};
export const getXecxAppAction = (xecxEmppStack: {
    remainingHex: string;
}): XecxAction | UnknownAction => {
    // Store this because we return it if we get unexpected spec
    const fullXecxEmppPush = xecxEmppStack.remainingHex;

    const supportedVersion = '00';

    // Version is 1 byte
    const version = consume(xecxEmppStack, 1);
    const VALID_LENGTH_VERSION_0_XECX_EMPP = 54;
    if (
        version !== supportedVersion ||
        fullXecxEmppPush.length !== VALID_LENGTH_VERSION_0_XECX_EMPP
    ) {
        // xecx lokadId EMPP push with unsupported version or bad v0 data
        // Return full push
        return {
            stack: fullXecxEmppPush,
            decoded: Buffer.from(fullXecxEmppPush, 'hex').toString('utf8'),
        };
    }

    // Get minBalanceTokenSatoshisToReceivePaymentThisRoundHexStr as 1st push u64
    const BYTES_U64 = 8;
    const minBalanceTokenSatoshisToReceivePaymentThisRound = Number(
        new Bytes(fromHex(consume(xecxEmppStack, BYTES_U64))).readU64(),
    );

    // Get eligibleTokenSatoshis as 2nd push u64
    const eligibleTokenSatoshis = Number(
        new Bytes(fromHex(consume(xecxEmppStack, BYTES_U64))).readU64(),
    );

    // Get ineligibleTokenSatoshis as 3rd push u64
    const ineligibleTokenSatoshis = Number(
        new Bytes(fromHex(consume(xecxEmppStack, BYTES_U64))).readU64(),
    );

    // Get excludedHoldersCount as 4th push u16
    const BYTES_U16 = 2;
    const excludedHoldersCount = new Bytes(
        fromHex(consume(xecxEmppStack, BYTES_U16)),
    ).readU16();

    return {
        minBalanceTokenSatoshisToReceivePaymentThisRound,
        eligibleTokenSatoshis,
        ineligibleTokenSatoshis,
        excludedHoldersCount,
    };
};
