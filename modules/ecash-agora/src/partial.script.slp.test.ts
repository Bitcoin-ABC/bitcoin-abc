// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    DEFAULT_DUST_LIMIT,
    fromHex,
    SLP_FUNGIBLE,
    SLP_MINT_VAULT,
    SLP_NFT1_GROUP,
    toHex,
} from 'ecash-lib';
import { AgoraPartial } from './partial.js';

const makerPk = fromHex(
    '03000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
);
const tokenId =
    '707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f';
const BASE_PARAMS_SLP = {
    makerPk,
    tokenId,
    tokenProtocol: 'SLP' as const,
    dustAmount: DEFAULT_DUST_LIMIT,
};

describe('AgoraPartial.script SLP', () => {
    it('AgoraPartial.script SLP 0,0 1000', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 1000n,
            numTokenTruncBytes: 0,
            tokenScaleFactor: 1000000n,
            scaledTruncTokensPerTruncSat: 1000000n,
            numSatsTruncBytes: 0,
            minAcceptedScaledTruncTokens: 1000000n,
            ...BASE_PARAMS_SLP,
            tokenType: SLP_FUNGIBLE,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(207);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c726a04534c500001010453454e4420707172737475767778797a7b7c7d7e7f' +
                '808182838485868788898a8b8c8d8e8f080000000000000000000040420f0000' +
                '00000040420f000000000040420f000000000003000102030405060708090a0b' +
                '0c0d0e0f101112131415161718191a1b1c1d1e1f0800ca9a3b00000000ab7b63' +
                '817b6ea269760340420fa269760340420f9700887d94527901377f7578926358' +
                '7e780340420f965880bc007e7e68587e52790340420f965880bc007e7e825980' +
                'bc7c7e007e7b033f420f930340420f9658807e041976a914707501517f77a97e' +
                '0288ac7e7e6b7d02220258800317a9147e024c7272587d807e7e7e01ab7e5379' +
                '01257f7702cf007f5c7f7701207f756b7ea97e01877e7c92647500687b829269' +
                '7e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501517f7768ad0750' +
                '41525449414c88044147523087',
        );
    });

    it('AgoraPartial.script SLP 1,1 10000', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 10000n,
            numTokenTruncBytes: 1,
            tokenScaleFactor: 2000n,
            scaledTruncTokensPerTruncSat: 2000n,
            numSatsTruncBytes: 1,
            minAcceptedScaledTruncTokens: 2000n,
            ...BASE_PARAMS_SLP,
            tokenType: SLP_MINT_VAULT,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(204);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c726a04534c500001020453454e4420707172737475767778797a7b7c7d7e7f' +
                '808182838485868788898a8b8c8d8e8f0800000000000000000101d007000000' +
                '000000d007000000000000d00700000000000003000102030405060708090a0b' +
                '0c0d0e0f101112131415161718191a1b1c1d1e1f08002d310100000000ab7b63' +
                '817b6ea2697602d007a2697602d0079700887d94527901377f75789263587e78' +
                '02d007965780bc01007e7e68587e527902d007965780bc01007e7e825980bc7c' +
                '7e01007e7b02cf079302d0079657807e041976a914707501517f77a97e0288ac' +
                '7e7e6b7d02220258800317a9147e024c7272587d807e7e7e01ab7e537901257f' +
                '7702cc007f5c7f7701207f756b7ea97e01877e7c92647500687b8292697e6c6c' +
                '7b7eaa88520144807c7ea86f7bbb7501c17e7c677501517f7768ad0750415254' +
                '49414c88044147523087',
        );
    });

    it('AgoraPartial.script SLP 2,2 0x30313233', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0x30313233n,
            numTokenTruncBytes: 2,
            tokenScaleFactor: 0x12345678n,
            scaledTruncTokensPerTruncSat: 0x98765432n,
            numSatsTruncBytes: 2,
            minAcceptedScaledTruncTokens: 0x454647n,
            ...BASE_PARAMS_SLP,
            tokenType: SLP_NFT1_GROUP,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(220);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c726a04534c500001810453454e4420707172737475767778797a7b7c7d7e7f' +
                '808182838485868788898a8b8c8d8e8f08000000000000000002027856341200' +
                '0000003254769800000000474645000000000003000102030405060708090a0b' +
                '0c0d0e0f101112131415161718191a1b1c1d1e1f08e8a948e6cc4f6d03ab7b63' +
                '817b6ea2697603474645a2697604785634129700887d94527901377f75789263' +
                '587e780478563412965680bc0200007e7e68587e52790478563412965680bc02' +
                '00007e7e825980bc7c7e0200007e7b053154769800930532547698009656807e' +
                '041976a914707501517f77a97e0288ac7e7e6b7d02220258800317a9147e024c' +
                '7272587d807e7e7e01ab7e537901257f7702dc007f5c7f7701207f756b7ea97e' +
                '01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501' +
                'c17e7c677501517f7768ad075041525449414c88044147523087',
        );
    });

    it('AgoraPartial.script SLP 3,3 0x7fffffff', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0x7fffffffn,
            numTokenTruncBytes: 3,
            tokenScaleFactor: 0x7fffffffn,
            scaledTruncTokensPerTruncSat: 0x7fffffffn,
            numSatsTruncBytes: 3,
            minAcceptedScaledTruncTokens: 0x7fffffffn,
            ...BASE_PARAMS_SLP,
            tokenType: SLP_FUNGIBLE,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(222);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c726a04534c500001010453454e4420707172737475767778797a7b7c7d7e7f' +
                '808182838485868788898a8b8c8d8e8f0800000000000000000303ffffff7f00' +
                '000000ffffff7f00000000ffffff7f0000000003000102030405060708090a0b' +
                '0c0d0e0f101112131415161718191a1b1c1d1e1f0801000000ffffff3fab7b63' +
                '817b6ea2697604ffffff7fa2697604ffffff7f9700887d94527901377f757892' +
                '63587e7804ffffff7f965580bc030000007e7e68587e527904ffffff7f965580' +
                'bc030000007e7e825980bc7c7e030000007e7b04feffff7f9304ffffff7f9655' +
                '807e041976a914707501517f77a97e0288ac7e7e6b7d02220258800317a9147e' +
                '024c7272587d807e7e7e01ab7e537901257f7702de007f5c7f7701207f756b7e' +
                'a97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb' +
                '7501c17e7c677501517f7768ad075041525449414c88044147523087',
        );
    });

    it('AgoraPartial.script SLP 4,4 0x7fff', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0x7fffn,
            numTokenTruncBytes: 4,
            tokenScaleFactor: 0x6fffn,
            scaledTruncTokensPerTruncSat: 0x5fffn,
            numSatsTruncBytes: 4,
            minAcceptedScaledTruncTokens: 0x4fffn,
            ...BASE_PARAMS_SLP,
            tokenType: SLP_MINT_VAULT,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(213);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c726a04534c500001020453454e4420707172737475767778797a7b7c7d7e7f' +
                '808182838485868788898a8b8c8d8e8f0800000000000000000404ff6f000000' +
                '000000ff5f000000000000ff4f00000000000003000102030405060708090a0b' +
                '0c0d0e0f101112131415161718191a1b1c1d1e1f080110ff3700000000ab7b63' +
                '817b6ea2697602ff4fa2697602ff6f9700887d94527901377f75789263587e78' +
                '02ff6f965480bc04000000007e7e68587e527902ff6f965480bc04000000007e' +
                '7e825980bc7c7e04000000007e7b02fe5f9302ff5f9654807e041976a9147075' +
                '01517f77a97e0288ac7e7e6b7d02220258800317a9147e024c7272587d807e7e' +
                '7e01ab7e537901257f7702d5007f5c7f7701207f756b7ea97e01877e7c926475' +
                '00687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c67750151' +
                '7f7768ad075041525449414c88044147523087',
        );
    });

    it('AgoraPartial.script SLP 5,4 0x7fff', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0xffffffn,
            numTokenTruncBytes: 5,
            tokenScaleFactor: 0x8123fffn,
            scaledTruncTokensPerTruncSat: 0x4123fffn,
            numSatsTruncBytes: 4,
            minAcceptedScaledTruncTokens: 0x2123fffn,
            ...BASE_PARAMS_SLP,
            tokenType: SLP_FUNGIBLE,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(233);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c726a04534c500001010453454e4420707172737475767778797a7b7c7d7e7f' +
                '808182838485868788898a8b8c8d8e8f0800000000000000000504ff3f120800' +
                '000000ff3f120400000000ff3f12020000000003000102030405060708090a0b' +
                '0c0d0e0f101112131415161718191a1b1c1d1e1f0801c0edf63f120800ab7b63' +
                '817b6ea2697604ff3f1202a2697604ff3f12089700887d94527901377f757892' +
                '63587e7804ff3f1208965480537f75bc0500000000007e7e68587e527904ff3f' +
                '1208965480537f75bc0500000000007e7e825980bc7c7e04000000007e7b04fe' +
                '3f12049304ff3f12049654807e041976a914707501517f77a97e0288ac7e7e6b' +
                '7d02220258800317a9147e024c7272587d807e7e7e01ab7e537901257f7702e9' +
                '007f5c7f7701207f756b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa' +
                '88520144807c7ea86f7bbb7501c17e7c677501517f7768ad075041525449414c' +
                '88044147523087',
        );
    });
});
