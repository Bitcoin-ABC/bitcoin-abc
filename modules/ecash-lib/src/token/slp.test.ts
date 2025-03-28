// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';

import {
    SLP_FUNGIBLE,
    SLP_MINT_VAULT,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
    slpBurn,
    slpGenesis,
    slpMint,
    slpMintVault,
    slpSend,
} from './slp.js';
import {
    parseSlp,
    SlpBurn,
    SlpGenesis,
    SlpMintClassic,
    SlpMintVault,
    SlpData,
    SlpSend,
    SlpUnknown,
} from './slp.parse.js';
import { Script } from '../script.js';
import { fromHex } from '../io/hex.js';
import { strToBytes } from '../io/str.js';

const KNOWN_SLP_TOKEN_TYPES = new Set([
    SLP_FUNGIBLE,
    SLP_MINT_VAULT,
    SLP_NFT1_CHILD,
    SLP_NFT1_GROUP,
]);

function parseSlpBytes(bytes: number[] | Uint8Array): SlpData | undefined {
    return parseSlp(new Script(new Uint8Array(bytes)));
}

describe('SLP', () => {
    it('SLP invalid usage', () => {
        expect(() => slpGenesis(99, {}, 0n)).to.throw('Unknown token type 99');
        expect(() => slpMint('', 77, 0n)).to.throw('Unknown token type 77');
        expect(() => slpMint('', 1, 0n)).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpMint('1'.repeat(64), 1, -1n)).to.throw(
            'Atoms out of range: -1',
        );
        expect(() => slpMint('1'.repeat(64), 1, 0x10000000000000000n)).to.throw(
            'Atoms out of range: 18446744073709551616',
        );
        expect(() => slpMintVault('', [])).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpMintVault('1'.repeat(64), [])).to.throw(
            'sendAtomsArray cannot be empty',
        );
        expect(() => slpMintVault('1'.repeat(64), new Array(20))).to.throw(
            'Cannot use more than 19 amounts, but got 20',
        );
        expect(() => slpMintVault('1'.repeat(64), [-1n])).to.throw(
            'Atoms out of range: -1',
        );
        expect(() =>
            slpMintVault('1'.repeat(64), [0x10000000000000000n]),
        ).to.throw('Atoms out of range: 18446744073709551616');
        expect(() => slpSend('', 66, [])).to.throw('Unknown token type 66');
        expect(() => slpSend('', 1, [])).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpSend('1'.repeat(64), 1, [])).to.throw(
            'sendAtomsArray cannot be empty',
        );
        expect(() => slpSend('1'.repeat(64), 1, new Array(20))).to.throw(
            'Cannot use more than 19 amounts, but got 20',
        );
        expect(() => slpSend('1'.repeat(64), 1, [-1n])).to.throw(
            'Atoms out of range: -1',
        );
        expect(() =>
            slpSend('1'.repeat(64), 1, [0x10000000000000000n]),
        ).to.throw('Atoms out of range: 18446744073709551616');
        expect(() => slpBurn('', 55, 0n)).to.throw('Unknown token type 55');
        expect(() => slpBurn('', 1, 0n)).to.throw(
            'Token ID must be 64 hex characters in length, but got 0',
        );
        expect(() => slpBurn('1'.repeat(64), 1, -1n)).to.throw(
            'Atoms out of range: -1',
        );
        expect(() => slpBurn('1'.repeat(64), 1, 0x10000000000000000n)).to.throw(
            'Atoms out of range: 18446744073709551616',
        );
    });
    it('SLP parse Missing OP_RETURN', () => {
        expect(parseSlp(new Script())).to.equal(undefined);
        expect(parseSlp(new Script(fromHex('00')))).to.equal(undefined);
        expect(parseSlp(new Script(fromHex('69')))).to.equal(undefined);
    });
    it('SLP parse Missing "SLP\\0"', () => {
        expect(parseSlp(new Script(fromHex('6a')))).to.equal(undefined);
        expect(parseSlp(new Script(strToBytes('\x6a\x03SLP')))).to.equal(
            undefined,
        );
        expect(parseSlp(new Script(strToBytes('\x6a\x04SLP\x01')))).to.equal(
            undefined,
        );
    });
    it('SLP parse Missing token type', () => {
        expect(() =>
            parseSlp(new Script(strToBytes('\x6a\x04SLP\0'))),
        ).to.throw('Missing tokenType');
    });
    it('SLP parse Bad token type', () => {
        expect(() =>
            parseSlp(new Script(strToBytes('\x6a\x04SLP\0\0'))),
        ).to.throw('SLP only supports push-ops');
        expect(() =>
            parseSlp(new Script(strToBytes('\x6a\x04SLP\0\x51'))),
        ).to.throw('SLP only supports push-ops');
        expect(() =>
            parseSlp(new Script(strToBytes('\x6a\x04SLP\0\x69'))),
        ).to.throw('SLP only supports push-ops');
        expect(() =>
            parseSlp(new Script(strToBytes('\x6a\x04SLP\0\x4c\0'))),
        ).to.throw('tokenType must be exactly 1 byte');
        expect(() =>
            parseSlp(new Script(strToBytes('\x6a\x04SLP\0\x02xx'))),
        ).to.throw('tokenType must be exactly 1 byte');
    });
    it('SLP parse Missing txType / Unknown tokenType', () => {
        for (let tokenType = 0; tokenType <= 0xff; ++tokenType) {
            const script = new Script(
                new Uint8Array([...strToBytes('\x6a\x04SLP\0\x01'), tokenType]),
            );
            if (KNOWN_SLP_TOKEN_TYPES.has(tokenType)) {
                expect(() => parseSlp(script)).to.throw('Missing txType');
            } else {
                expect(parseSlp(script)).to.deep.equal({
                    txType: 'UNKNOWN',
                    tokenType,
                } as SlpUnknown);
            }
        }
    });
    it('SLP parse Unknown txType', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [...strToBytes('\x6a\x04SLP\0\x01'), tokenType];
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() =>
                parseSlpBytes([...prefix, ...strToBytes('\x4c\0')]),
            ).to.throw('Unknown txType');
            expect(() =>
                parseSlpBytes([...prefix, ...strToBytes('\x01x')]),
            ).to.throw('Unknown txType');
            expect(() =>
                parseSlpBytes([...prefix, ...strToBytes('\x07UNKNOWN')]),
            ).to.throw('Unknown txType');
        }
    });
    it('SLP parse GENESIS missing info', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x07GENESIS'),
            ];
            expect(() => parseSlpBytes([...prefix])).to.throw(
                'Missing tokenTicker',
            );
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0])).to.throw(
                'Missing tokenName',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'Missing tokenName',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0, 1, 0])).to.throw(
                'Missing url',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0, 0x4c, 0])).to.throw(
                'Missing url',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0, 1, 0, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0])).to.throw(
                'Missing hash',
            );
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 0x4c, 0]),
            ).to.throw('Missing hash');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 0]),
            ).to.throw('SLP only supports push-ops');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 1, 0]),
            ).to.throw('hash must be either 0 or 32 bytes');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 0x4c, 0]),
            ).to.throw('Missing decimals');
            expect(() =>
                parseSlpBytes([
                    ...prefix,
                    ...[1, 0, 1, 0, 1, 0, 32],
                    ...new Uint8Array(32),
                ]),
            ).to.throw('Missing decimals');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 0x4c, 0, 0]),
            ).to.throw('SLP only supports push-ops');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 0x4c, 0, 0x4c, 0]),
            ).to.throw('decimals must be exactly 1 byte');
            expect(() =>
                parseSlpBytes([
                    ...prefix,
                    ...[1, 0, 1, 0, 1, 0, 0x4c, 0, 2, 99, 99],
                ]),
            ).to.throw('decimals must be exactly 1 byte');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 0x4c, 0, 1, 10]),
            ).to.throw('decimals must be at most 9');
            expect(() =>
                parseSlpBytes([...prefix, 1, 0, 1, 0, 1, 0, 0x4c, 0, 1, 9, 0]),
            ).to.throw('SLP only supports push-ops');
        }
    });
    it('SLP parse GENESIS MINT VAULT', () => {
        const prefix = strToBytes(
            '\x6a\x04SLP\0\x01\x02\x07GENESIS\x01\0\x01\0\x01\0\x4c\0\x01\x04',
        );
        expect(() => parseSlpBytes(prefix)).to.throw(
            'Missing mintVaultScripthash',
        );
        expect(() =>
            parseSlpBytes([...prefix, 19, ...new Uint8Array(19)]),
        ).to.throw('mintVaultScripthash must be exactly 20 bytes long');
        expect(() =>
            parseSlpBytes([...prefix, 20, ...new Uint8Array(20)]),
        ).to.throw('Missing initialAtoms');
        expect(() =>
            parseSlpBytes([...prefix, 20, ...new Uint8Array(20), 0]),
        ).to.throw('SLP only supports push-ops');
        expect(() =>
            parseSlpBytes([...prefix, 20, ...new Uint8Array(20), ...[1, 0]]),
        ).to.throw('SLP atoms must be exactly 8 bytes long');
        expect(() =>
            parseSlpBytes([
                ...prefix,
                20,
                ...new Uint8Array(20),
                ...[8, 0, 0, 0, 0, 0, 0, 0, 0],
                0,
            ]),
        ).to.throw('Superfluous GENESIS bytes');

        // Success
        expect(
            parseSlpBytes([
                ...prefix,
                20,
                ...new Uint8Array(20),
                ...[8, 0, 0, 0, 0, 0, 0, 0, 0],
            ]),
        ).to.deep.equal({
            txType: 'GENESIS',
            tokenType: SLP_MINT_VAULT,
            genesisInfo: {
                tokenTicker: '\0',
                tokenName: '\0',
                url: '\0',
                hash: undefined,
                mintVaultScripthash: '0000000000000000000000000000000000000000',
                decimals: 4,
            },
            initialAtoms: 0n,
            mintBatonOutIdx: undefined,
        } as SlpGenesis);
    });
    it('SLP parse GENESIS MINT VAULT BUX', () => {
        // BUX (0x02) 52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6
        const buxScriptHex = `6a04534c500001020747454e45534953034255581642616467657220\
556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c0001041408d6ed\
f91c7b93d18306d3b8244587e43f11df4b080000000000000000`;
        expect(parseSlp(new Script(fromHex(buxScriptHex)))).to.deep.equal({
            txType: 'GENESIS',
            tokenType: SLP_MINT_VAULT,
            genesisInfo: {
                tokenTicker: 'BUX',
                tokenName: 'Badger Universal Token',
                url: 'https://bux.digital',
                hash: undefined,
                mintVaultScripthash: '08d6edf91c7b93d18306d3b8244587e43f11df4b',
                decimals: 4,
            },
            initialAtoms: 0n,
            mintBatonOutIdx: undefined,
        } as SlpGenesis);
    });
    it('SLP parse GENESIS Classic', () => {
        for (const tokenType of [
            SLP_FUNGIBLE,
            SLP_NFT1_CHILD,
            SLP_NFT1_GROUP,
        ]) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x07GENESIS\x01\0\x01\0\x01\0\x4c\0\x01\x04'),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw(
                'Missing mintBatonOutIdx',
            );
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 2, 0, 0])).to.throw(
                'mintBatonOutIdx must be at most 1 byte long',
            );
            for (const i of [0, 1]) {
                expect(() => parseSlpBytes([...prefix, 1, i])).to.throw(
                    tokenType === SLP_NFT1_CHILD
                        ? 'SLP_NFT1_CHILD cannot have a mint baton'
                        : 'mintBatonOutIdx must be at least 2',
                );
            }
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'Missing initialAtoms',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0, 1, 0])).to.throw(
                'SLP atoms must be exactly 8 bytes long',
            );
            expect(() =>
                parseSlpBytes([
                    ...prefix,
                    ...[0x4c, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 99],
                ]),
            ).to.throw('Superfluous GENESIS bytes');

            // Success (no mint baton)
            expect(
                parseSlpBytes([...prefix, 0x4c, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0]),
            ).to.deep.equal({
                txType: 'GENESIS',
                tokenType,
                genesisInfo: {
                    tokenTicker: '\0',
                    tokenName: '\0',
                    url: '\0',
                    hash: undefined,
                    mintVaultScripthash: undefined,
                    decimals: 4,
                },
                initialAtoms: 0n,
                mintBatonOutIdx: undefined,
            } as SlpGenesis);

            // With mint baton
            const withMintBaton = [...prefix, 1, 2, 8, 1, 2, 3, 4, 5, 6, 7, 8];
            if (tokenType !== SLP_NFT1_CHILD) {
                expect(parseSlpBytes(withMintBaton)).to.deep.equal({
                    txType: 'GENESIS',
                    tokenType,
                    genesisInfo: {
                        tokenTicker: '\0',
                        tokenName: '\0',
                        url: '\0',
                        hash: undefined,
                        mintVaultScripthash: undefined,
                        decimals: 4,
                    },
                    initialAtoms: 0x0102030405060708n,
                    mintBatonOutIdx: 2,
                } as SlpGenesis);
            } else {
                expect(() => parseSlpBytes(withMintBaton)).to.throw(
                    'SLP_NFT1_CHILD cannot have a mint baton',
                );
            }

            // Success, with hash
            const hash =
                '2908560932487503948670398463abcefd3947562938923659246757456abcde';
            expect(
                parseSlpBytes([
                    ...strToBytes('\x6a\x04SLP\0\x01'),
                    tokenType,
                    ...strToBytes('\x07GENESIS\x01\0\x01\0\x01\0\x20'),
                    ...fromHex(hash),
                    ...[1, 4, 0x4c, 0, 8, 0, 0, 0, 0, 0, 0, 0x56, 0x78],
                ]),
            ).to.deep.equal({
                txType: 'GENESIS',
                tokenType,
                genesisInfo: {
                    tokenTicker: '\0',
                    tokenName: '\0',
                    url: '\0',
                    hash,
                    mintVaultScripthash: undefined,
                    decimals: 4,
                },
                initialAtoms: 0x5678n,
                mintBatonOutIdx: undefined,
            } as SlpGenesis);
        }
    });
    it('SLP parse GENESIS SLP FUNGIBLE BUX', () => {
        // BUX (0x01) 7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5
        const buxScriptHex = `6a04534c500001010747454e45534953034255581642616467657220\
556e6976657273616c20546f6b656e1368747470733a2f2f6275782e6469676974616c4c00010401020800\
00000000000000`;
        expect(parseSlp(new Script(fromHex(buxScriptHex)))).to.deep.equal({
            txType: 'GENESIS',
            tokenType: SLP_FUNGIBLE,
            genesisInfo: {
                tokenTicker: 'BUX',
                tokenName: 'Badger Universal Token',
                url: 'https://bux.digital',
                hash: undefined,
                mintVaultScripthash: undefined,
                decimals: 4,
            },
            initialAtoms: 0n,
            mintBatonOutIdx: 2,
        } as SlpGenesis);
    });
    it('SLP parse MINT bad token ID', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x04MINT'),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw('Missing tokenId');
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'tokenId must be exactly 32 bytes long',
            );
            expect(() =>
                parseSlpBytes([...prefix, 31, ...new Uint8Array(31)]),
            ).to.throw('tokenId must be exactly 32 bytes long');
        }
    });
    it('SLP parse MINT VAULT', () => {
        const prefix = [
            ...strToBytes('\x6a\x04SLP\0\x01\x02\x04MINT\x20'),
            ...new Uint8Array(32),
        ];
        expect(() => parseSlpBytes(prefix)).to.throw(
            'atomsArray cannot be empty',
        );
        expect(() => parseSlpBytes([...prefix, 0])).to.throw(
            'SLP only supports push-ops',
        );
        expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
            'SLP atoms must be exactly 8 bytes long',
        );
        expect(() =>
            parseSlpBytes([...prefix, 7, 0, 0, 0, 0, 0, 0, 0]),
        ).to.throw('SLP atoms must be exactly 8 bytes long');
        expect(() =>
            parseSlpBytes([...prefix, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0x4c, 0]),
        ).to.throw('SLP atoms must be exactly 8 bytes long');
        for (let num = 1; num <= 30; ++num) {
            const scriptBytes = [...prefix];
            const expectedAtomsArray = [];
            for (let idx = 0; idx < num; ++idx) {
                scriptBytes.push(...[8, 0, 0, 0, 0, 0, 0, 0, idx]);
                expectedAtomsArray.push(BigInt(idx));
            }
            if (num <= 19) {
                expect(parseSlpBytes(scriptBytes)).to.deep.equal({
                    txType: 'MINT',
                    tokenType: SLP_MINT_VAULT,
                    tokenId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    additionalAtomsArray: expectedAtomsArray,
                } as SlpMintVault);
            } else {
                expect(() => parseSlpBytes(scriptBytes)).to.throw(
                    'atomsArray can at most be 19 items long',
                );
            }
        }
    });
    it('SLP parse MINT VAULT BUX', () => {
        // BUX tx 09e14665aa2980db8001a04ec350ef7cc2b77094efcd634c62dadf0940870912
        const buxScriptHex = `6a04534c50000102044d494e542052b12c03466936e7e3b2dcfcff84\
7338c53c611ba8ab74dd8e4dadf7ded12cf60800000000000007d0080000000000000fa008000000000000\
9c40`;
        expect(parseSlp(new Script(fromHex(buxScriptHex)))).to.deep.equal({
            txType: 'MINT',
            tokenType: SLP_MINT_VAULT,
            tokenId:
                '52b12c03466936e7e3b2dcfcff847338c53c611ba8ab74dd8e4dadf7ded12cf6',
            additionalAtomsArray: [2000n, 4000n, 40000n],
        } as SlpMintVault);
    });
    it('SLP parse MINT FUNGIBLE and NFT GROUP', () => {
        for (const tokenType of [SLP_FUNGIBLE, SLP_NFT1_GROUP]) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x04MINT\x20'),
                ...new Uint8Array(32),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw(
                'Missing mintBatonOutIdx',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 2, 0, 0])).to.throw(
                'mintBatonOutIdx must be at most 1 byte long',
            );
            for (const i of [0, 1]) {
                expect(() => parseSlpBytes([...prefix, 1, i])).to.throw(
                    'mintBatonOutIdx must be at least 2',
                );
            }
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'Missing additionalAtoms',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0, 1, 0])).to.throw(
                'SLP atoms must be exactly 8 bytes long',
            );
            expect(() =>
                parseSlpBytes([
                    ...prefix,
                    ...[0x4c, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 99],
                ]),
            ).to.throw('Superfluous MINT bytes');

            // Success (no mint baton)
            expect(
                parseSlpBytes([...prefix, 0x4c, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0]),
            ).to.deep.equal({
                txType: 'MINT',
                tokenType,
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                additionalAtoms: 0n,
                mintBatonOutIdx: undefined,
            } as SlpMintClassic);

            // With mint baton
            expect(
                parseSlpBytes([...prefix, 1, 2, 8, 1, 2, 3, 4, 5, 6, 7, 8]),
            ).to.deep.equal({
                txType: 'MINT',
                tokenType,
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                additionalAtoms: 0x0102030405060708n,
                mintBatonOutIdx: 2,
            } as SlpMintClassic);
        }
    });
    it('SLP parse MINT FUNGIBLE BUX', () => {
        // BUX tx 459a8dbf3b31750ddaaed4d2c6a12fb42ef1b83fc0f67175f43332962932aa7d
        const buxScriptHex = `6a04534c50000101044d494e54207e7dacd72dcdb14e00a03dd3aff4\
7f019ed51a6f1f4e4f532ae50692f62bc4e501020800000000000030d4`;
        expect(parseSlp(new Script(fromHex(buxScriptHex)))).to.deep.equal({
            txType: 'MINT',
            tokenType: SLP_FUNGIBLE,
            tokenId:
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
            additionalAtoms: 12500n,
            mintBatonOutIdx: 2,
        } as SlpMintClassic);
    });
    it('SLP parse MINT NFT CHILD', () => {
        expect(() =>
            parseSlpBytes([
                ...strToBytes('\x6a\x04SLP\0\x01\x41\x04MINT\x20'),
                ...new Uint8Array(32),
            ]),
        ).to.throw('SLP_NFT1_CHILD cannot have MINT transactions');
    });
    it('SLP parse SEND bad token ID', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x04SEND'),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw('Missing tokenId');
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'tokenId must be exactly 32 bytes long',
            );
            expect(() =>
                parseSlpBytes([...prefix, 31, ...new Uint8Array(31)]),
            ).to.throw('tokenId must be exactly 32 bytes long');
        }
    });
    it('SLP parse SEND', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x04SEND\x20'),
                ...new Uint8Array(32),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw(
                'atomsArray cannot be empty',
            );
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'SLP atoms must be exactly 8 bytes long',
            );
            expect(() =>
                parseSlpBytes([...prefix, 7, 0, 0, 0, 0, 0, 0, 0]),
            ).to.throw('SLP atoms must be exactly 8 bytes long');
            expect(() =>
                parseSlpBytes([...prefix, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0x4c, 0]),
            ).to.throw('SLP atoms must be exactly 8 bytes long');
            for (let num = 1; num <= 30; ++num) {
                const scriptBytes = [...prefix];
                const expectedAtomsArray = [];
                for (let idx = 0; idx < num; ++idx) {
                    scriptBytes.push(...[8, 0, 0, 0, 0, 0, 0, 0, idx]);
                    expectedAtomsArray.push(BigInt(idx));
                }
                if (num <= 19) {
                    expect(parseSlpBytes(scriptBytes)).to.deep.equal({
                        txType: 'SEND',
                        tokenType,
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        sendAtomsArray: expectedAtomsArray,
                    } as SlpSend);
                } else {
                    expect(() => parseSlpBytes(scriptBytes)).to.throw(
                        'atomsArray can at most be 19 items long',
                    );
                }
            }
        }
    });
    it('SLP parse BURN bad token ID', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x04BURN'),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw('Missing tokenId');
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'tokenId must be exactly 32 bytes long',
            );
            expect(() =>
                parseSlpBytes([...prefix, 31, ...new Uint8Array(31)]),
            ).to.throw('tokenId must be exactly 32 bytes long');
        }
    });
    it('SLP parse BURN', () => {
        for (const tokenType of KNOWN_SLP_TOKEN_TYPES) {
            const prefix = [
                ...strToBytes('\x6a\x04SLP\0\x01'),
                tokenType,
                ...strToBytes('\x04BURN\x20'),
                ...new Uint8Array(32),
            ];
            expect(() => parseSlpBytes(prefix)).to.throw('Missing burnAtoms');
            expect(() => parseSlpBytes([...prefix, 0])).to.throw(
                'SLP only supports push-ops',
            );
            expect(() => parseSlpBytes([...prefix, 0x4c, 0])).to.throw(
                'SLP atoms must be exactly 8 bytes long',
            );
            expect(() => parseSlpBytes([...prefix, 1, 0])).to.throw(
                'SLP atoms must be exactly 8 bytes long',
            );
            expect(() =>
                parseSlpBytes([...prefix, ...[8, 0, 0, 0, 0, 0, 0, 0, 0, 99]]),
            ).to.throw('Superfluous BURN bytes');

            // Success (no mint baton)
            expect(
                parseSlpBytes([...prefix, 8, 1, 2, 3, 4, 5, 6, 7, 8]),
            ).to.deep.equal({
                txType: 'BURN',
                tokenType,
                tokenId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                burnAtoms: 0x0102030405060708n,
            } as SlpBurn);
        }
    });
    it('SLP parse BURN SLP FUNGIBLE BUX', () => {
        // BUX tx 94006ad05803922d743a44a51145c13d91826c7e97ffbe8cb0c994653166762e
        const buxScriptHex = `6a04534c50000101044255524e207e7dacd72dcdb14e00a03dd3aff4\
7f019ed51a6f1f4e4f532ae50692f62bc4e5080000000001481060`;
        expect(parseSlp(new Script(fromHex(buxScriptHex)))).to.deep.equal({
            txType: 'BURN',
            tokenType: SLP_FUNGIBLE,
            tokenId:
                '7e7dacd72dcdb14e00a03dd3aff47f019ed51a6f1f4e4f532ae50692f62bc4e5',
            burnAtoms: 21500000n,
        } as SlpBurn);
    });
});
