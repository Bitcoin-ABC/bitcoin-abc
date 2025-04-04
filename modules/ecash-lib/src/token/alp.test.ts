// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import { fromHex } from '../io/hex.js';
import { strToBytes } from '../io/str.js';
import { ALP_STANDARD } from './alp.js';
import {
    AlpBurn,
    AlpData,
    AlpGenesis,
    AlpMint,
    AlpSend,
    AlpUnknown,
    parseAlp,
} from './alp.parse.js';
import { GenesisInfo } from './common.js';

const KNOWN_ALP_TOKEN_TYPES = new Set([ALP_STANDARD]);

function parseAlpStr(str: string): AlpData | undefined {
    return parseAlp(strToBytes(str));
}

function parseAlpBytes(bytes: number[] | Uint8Array): AlpData | undefined {
    return parseAlp(new Uint8Array(bytes));
}

describe('ALP', () => {
    it('ALP parse Missing "SLP2"', () => {
        expect(parseAlpStr('SLP')).to.equal(undefined);
        expect(parseAlpStr('SLP\0')).to.equal(undefined);
        expect(parseAlpStr('\x04SLP\0')).to.equal(undefined);
        expect(parseAlpStr('\x04SLP2')).to.equal(undefined);
    });
    it('ALP parse Missing token type', () => {
        expect(() => parseAlpStr('SLP2')).to.throw('Missing tokenType');
    });
    it('ALP parse Missing txType / Unknown tokenType', () => {
        for (let tokenType = 0; tokenType <= 0xff; ++tokenType) {
            const data = new Uint8Array([...strToBytes('SLP2'), tokenType]);
            if (KNOWN_ALP_TOKEN_TYPES.has(tokenType)) {
                expect(() => parseAlp(data)).to.throw('Missing txType');
            } else {
                expect(parseAlp(data)).to.deep.equal({
                    txType: 'UNKNOWN',
                    tokenType,
                } as AlpUnknown);
            }
        }
    });
    it('ALP parse Unknown txType', () => {
        for (const tokenType of KNOWN_ALP_TOKEN_TYPES) {
            const prefix = [...strToBytes('SLP2'), tokenType];
            expect(() => parseAlpBytes([...prefix, 0])).to.throw(
                'Unknown txType',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...strToBytes('\x01x')]),
            ).to.throw('Unknown txType');
            expect(() =>
                parseAlpBytes([...prefix, ...strToBytes('\x07UNKNOWN')]),
            ).to.throw('Unknown txType');
        }
    });
    it('ALP parse GENESIS missing info', () => {
        for (const tokenType of KNOWN_ALP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('SLP2'),
                tokenType,
                ...strToBytes('\x07GENESIS'),
            ];
            expect(() => parseAlpBytes([...prefix])).to.throw(
                'Missing tokenTicker',
            );
            expect(() => parseAlpBytes([...prefix, 0])).to.throw(
                'Missing tokenName',
            );
            expect(() => parseAlpBytes([...prefix, 1, 0])).to.throw(
                'Missing tokenName',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0])).to.throw(
                'Missing url',
            );
            expect(() => parseAlpBytes([...prefix, 0, 1, 0])).to.throw(
                'Missing url',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 0])).to.throw(
                'Missing data',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 1, 0])).to.throw(
                'Missing data',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 0, 0])).to.throw(
                'Missing authPubkey',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 0, 1, 0])).to.throw(
                'Missing authPubkey',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 0, 0, 0])).to.throw(
                'Missing decimals',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 0, 0, 1, 0])).to.throw(
                'Missing decimals',
            );
            expect(() => parseAlpBytes([...prefix, 0, 0, 0, 0, 0, 0])).to.throw(
                'Missing atomsArray',
            );
            expect(() =>
                parseAlpBytes([...prefix, 0, 0, 0, 0, 0, 0, 1, 0]),
            ).to.throw(
                'Not enough bytes: Tried reading 6 byte(s), but there are only 1 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]),
            ).to.throw(
                'Not enough bytes: Tried reading 6 byte(s), but there are only 5 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, 0, 0, 0, 0, 0, 0, 0]),
            ).to.throw('Missing numBatons');
        }
    });
    it('ALP parse GENESIS', () => {
        for (const tokenType of KNOWN_ALP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('SLP2'),
                tokenType,
                ...strToBytes('\x07GENESIS\x01\0\x01\0\x01\0\x01\0\x01\0\x04'),
            ];
            expect(() => parseAlpBytes([...prefix, ...[0, 0, 99]])).to.throw(
                'Superfluous GENESIS bytes',
            );

            const nullGenesisInfo: GenesisInfo = {
                tokenTicker: '\0',
                tokenName: '\0',
                url: '\0',
                data: '00',
                authPubkey: '00',
                decimals: 4,
            };

            // Success (no mint batons)
            expect(parseAlpBytes([...prefix, 0, 0])).to.deep.equal({
                txType: 'GENESIS',
                tokenType,
                genesisInfo: nullGenesisInfo,
                mintData: {
                    atomsArray: [],
                    numBatons: 0,
                },
            } as AlpGenesis);

            // With 99 mint batons and 3 initial outputs
            expect(
                parseAlpBytes([
                    ...prefix,
                    ...[
                        3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                        99,
                    ],
                ]),
            ).to.deep.equal({
                txType: 'GENESIS',
                tokenType,
                genesisInfo: nullGenesisInfo,
                mintData: {
                    atomsArray: [
                        0x060504030201n,
                        0x030201090807n,
                        0x090807060504n,
                    ],
                    numBatons: 99,
                },
            } as AlpGenesis);

            for (let num = 0; num <= 0xff; ++num) {
                const bytes = [...prefix, num];
                const expectedAtomsArray = [];
                for (let idx = 0; idx < num; ++idx) {
                    bytes.push(...[idx, 0, 0, 0, 0, 0]);
                    expectedAtomsArray.push(BigInt(idx));
                }
                bytes.push(0);
                if (num <= 127) {
                    expect(parseAlpBytes(bytes)).to.deep.equal({
                        txType: 'GENESIS',
                        tokenType,
                        genesisInfo: nullGenesisInfo,
                        mintData: {
                            atomsArray: expectedAtomsArray,
                            numBatons: 0,
                        },
                    } as AlpGenesis);
                } else {
                    expect(() => parseAlpBytes(bytes)).to.throw(
                        'Size must be between 0 and 127',
                    );
                }
            }
            for (let num = 0; num <= 0xff; ++num) {
                const bytes = [...prefix, 0, num];
                if (num <= 127) {
                    expect(parseAlpBytes(bytes)).to.deep.equal({
                        txType: 'GENESIS',
                        tokenType,
                        genesisInfo: nullGenesisInfo,
                        mintData: {
                            atomsArray: [],
                            numBatons: num,
                        },
                    } as AlpGenesis);
                } else {
                    expect(() => parseAlpBytes(bytes)).to.throw(
                        'numBatons must be between 0 and 127',
                    );
                }
            }
        }
    });
    it('ALP parse GENESIS CRD', () => {
        // CRD cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145
        const crdPushdataHex = `534c5032000747454e455349530343524411437265646f20496e20\
556e756d2044656f1968747470733a2f2f6372642e6e6574776f726b2f746f6b656e00210334b744e6338a\
d438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10040001`;
        expect(parseAlp(fromHex(crdPushdataHex))).to.deep.equal({
            txType: 'GENESIS',
            tokenType: ALP_STANDARD,
            genesisInfo: {
                tokenTicker: 'CRD',
                tokenName: 'Credo In Unum Deo',
                url: 'https://crd.network/token',
                data: '',
                authPubkey:
                    '0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a88447b6e2b145f10',
                decimals: 4,
            },
            mintData: {
                atomsArray: [],
                numBatons: 1,
            },
        } as AlpGenesis);
    });
    it('ALP parse MINT', () => {
        for (const tokenType of KNOWN_ALP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('SLP2'),
                tokenType,
                ...strToBytes('\x04MINT'),
            ];
            expect(() => parseAlpBytes(prefix)).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 0 byte(s) left',
            );
            expect(() => parseAlpBytes([...prefix, 0])).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 1 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(31)]),
            ).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 31 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32)]),
            ).to.throw('Missing atomsArray');
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32), 0]),
            ).to.throw('Missing numBatons');
            expect(() =>
                parseAlpBytes([
                    ...prefix,
                    ...new Uint8Array(32),
                    ...[0, 0, 99],
                ]),
            ).to.throw('Superfluous MINT bytes');
            expect(
                parseAlpBytes([...prefix, ...new Uint8Array(32), 0, 0]),
            ).to.deep.equal({
                txType: 'MINT',
                tokenType: ALP_STANDARD,
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                mintData: {
                    atomsArray: [],
                    numBatons: 0,
                },
            } as AlpMint);
            for (let num = 0; num <= 0xff; ++num) {
                const bytes = [...prefix, ...new Uint8Array(32), num];
                const expectedAtomsArray = [];
                for (let idx = 0; idx < num; ++idx) {
                    bytes.push(...[idx, 0, 0, 0, 0, 0]);
                    expectedAtomsArray.push(BigInt(idx));
                }
                bytes.push(0);
                if (num <= 127) {
                    expect(parseAlpBytes(bytes)).to.deep.equal({
                        txType: 'MINT',
                        tokenType,
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        mintData: {
                            atomsArray: expectedAtomsArray,
                            numBatons: 0,
                        },
                    } as AlpMint);
                } else {
                    expect(() => parseAlpBytes(bytes)).to.throw(
                        'Size must be between 0 and 127',
                    );
                }
            }
            for (let num = 0; num <= 0xff; ++num) {
                const bytes = [...prefix, ...new Uint8Array(32), 0, num];
                if (num <= 127) {
                    expect(parseAlpBytes(bytes)).to.deep.equal({
                        txType: 'MINT',
                        tokenType,
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        mintData: {
                            atomsArray: [],
                            numBatons: num,
                        },
                    } as AlpMint);
                } else {
                    expect(() => parseAlpBytes(bytes)).to.throw(
                        'numBatons must be between 0 and 127',
                    );
                }
            }
        }
    });
    it('ALP parse MINT CRD', () => {
        // CRD tx ff06c312bef229f6f27989326d9be7e0e142aaa84538967b104b262af69f7f00
        const crdPushdataHex = `534c503200044d494e5445e1f25de444e399b6d46fa66e3424c04549\
a85a14b12bc9a4ddc9cdcdcdcdcd007f`;
        expect(parseAlp(fromHex(crdPushdataHex))).to.deep.equal({
            txType: 'MINT',
            tokenType: ALP_STANDARD,
            tokenId:
                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            mintData: {
                atomsArray: [],
                numBatons: 127,
            },
        } as AlpMint);
    });
    it('ALP parse SEND', () => {
        for (const tokenType of KNOWN_ALP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('SLP2'),
                tokenType,
                ...strToBytes('\x04SEND'),
            ];

            expect(() => parseAlpBytes(prefix)).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 0 byte(s) left',
            );
            expect(() => parseAlpBytes([...prefix, 0])).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 1 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(31)]),
            ).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 31 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32)]),
            ).to.throw('Missing sendAtomsArray');
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32), 0, 99]),
            ).to.throw('Superfluous SEND bytes');
            const nullTokenId =
                '0000000000000000000000000000000000000000000000000000000000000000';
            expect(
                parseAlpBytes([...prefix, ...new Uint8Array(32), 0]),
            ).to.deep.equal({
                txType: 'SEND',
                tokenType: ALP_STANDARD,
                tokenId: nullTokenId,
                sendAtomsArray: [],
            } as AlpSend);
            for (let num = 0; num <= 0xff; ++num) {
                const bytes = [...prefix, ...new Uint8Array(32), num];
                const expectedAtomsArray = [];
                for (let idx = 0; idx < num; ++idx) {
                    bytes.push(...[idx, 0, 0, 0, 0, 0]);
                    expectedAtomsArray.push(BigInt(idx));
                }
                if (num <= 127) {
                    expect(parseAlpBytes(bytes)).to.deep.equal({
                        txType: 'SEND',
                        tokenType,
                        tokenId: nullTokenId,
                        sendAtomsArray: expectedAtomsArray,
                    } as AlpSend);
                } else {
                    expect(() => parseAlpBytes(bytes)).to.throw(
                        'Size must be between 0 and 127',
                    );
                }
            }
        }
    });
    it('ALP parse SEND CRD', () => {
        // CRD tx 0174a5c941b74d403ad9d7857f8b23fe83dc6245f19a5dc2be5f92f1d2dc336c
        const crdPushdataHex = `534c5032000453454e4445e1f25de444e399b6d46fa66e3424c04549\
a85a14b12bc9a4ddc9cdcdcdcdcd03e80300000000948f04000000640000000000`;
        expect(parseAlp(fromHex(crdPushdataHex))).to.deep.equal({
            txType: 'SEND',
            tokenType: ALP_STANDARD,
            tokenId:
                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            sendAtomsArray: [1000n, 298900n, 100n],
        } as AlpSend);
    });
    it('ALP parse BURN', () => {
        for (const tokenType of KNOWN_ALP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('SLP2'),
                tokenType,
                ...strToBytes('\x04BURN'),
            ];
            expect(() => parseAlpBytes(prefix)).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 0 byte(s) left',
            );
            expect(() => parseAlpBytes([...prefix, 0])).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 1 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(31)]),
            ).to.throw(
                'Not enough bytes: Tried reading 32 byte(s), but there are only 31 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32)]),
            ).to.throw('Missing burnAtoms');
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32), 0]),
            ).to.throw(
                'Not enough bytes: Tried reading 6 byte(s), but there are only 1 byte(s) left',
            );
            expect(() =>
                parseAlpBytes([...prefix, ...new Uint8Array(32 + 6), 99]),
            ).to.throw('Superfluous BURN bytes');
            const nullTokenId =
                '0000000000000000000000000000000000000000000000000000000000000000';
            expect(
                parseAlpBytes([
                    ...prefix,
                    ...new Uint8Array(32),
                    ...[1, 2, 3, 4, 5, 6],
                ]),
            ).to.deep.equal({
                txType: 'BURN',
                tokenType: ALP_STANDARD,
                tokenId: nullTokenId,
                burnAtoms: 0x060504030201n,
            } as AlpBurn);
        }
    });
    it('ALP parse BURN CRD', () => {
        // CRD tx 916da11ae0506683be31b20464ef6cfda258ca83f0032819acacc435ddda96b0
        const crdPushdataHex = `534c503200044255524e45e1f25de444e399b6d46fa66e3424c04549\
a85a14b12bc9a4ddc9cdcdcdcdcd917102030000`;
        expect(parseAlp(fromHex(crdPushdataHex))).to.deep.equal({
            txType: 'BURN',
            tokenType: ALP_STANDARD,
            tokenId:
                'cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            burnAtoms: 50491793n,
        } as AlpBurn);
    });
});
