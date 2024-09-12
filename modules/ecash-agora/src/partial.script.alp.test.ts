// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ALP_STANDARD, DEFAULT_DUST_LIMIT, fromHex, toHex } from 'ecash-lib';

import { AgoraPartial } from './partial.js';

const makerPk = fromHex(
    '03000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
);
const tokenId =
    '707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f';
const BASE_PARAMS_ALP = {
    makerPk,
    tokenId,
    tokenProtocol: 'ALP' as const,
    tokenType: ALP_STANDARD,
    dustAmount: DEFAULT_DUST_LIMIT,
};

describe('AgoraPartial.script ALP', () => {
    it('AgoraPartial.script ALP 0,0 1000', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 1000n,
            numTokenTruncBytes: 0,
            tokenScaleFactor: 1000000n,
            scaledTruncTokensPerTruncSat: 1000000n,
            numSatsTruncBytes: 0,
            minAcceptedScaledTruncTokens: 1000000n,
            ...BASE_PARAMS_ALP,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(200);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c74534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504741475230075041525449414c000040420f' +
                '000000000040420f000000000040420f00000000000300010203040506070809' +
                '0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f0800ca9a3b00000000ab' +
                '7b63817b6ea269760340420fa269760340420f9700887d945279012a7f757892' +
                '635357807e780340420f965667525768807e52790340420f9656807e827c7e53' +
                '79012a7f777c7e825980bc7c7e007e7b033f420f930340420f9658807e041976' +
                'a914707501537f77a97e0288ac7e7e6b7d02220258800317a9147e024c747258' +
                '7d807e7e7e01ab7e537901257f7702c8007f5c7f7701207f756b7ea97e01877e' +
                '7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c' +
                '677501537f7768ac',
        );
    });

    it('AgoraPartial.script ALP 1,1 10000', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 10000n,
            numTokenTruncBytes: 1,
            tokenScaleFactor: 2000n,
            scaledTruncTokensPerTruncSat: 2000n,
            numSatsTruncBytes: 1,
            minAcceptedScaledTruncTokens: 2000n,
            ...BASE_PARAMS_ALP,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(195);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c74534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504741475230075041525449414c0101d00700' +
                '0000000000d007000000000000d0070000000000000300010203040506070809' +
                '0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f08002d310100000000ab' +
                '7b63817b6ea2697602d007a2697602d0079700887d945279012a7f7578926353' +
                '58807e7802d007965667525868807e527902d0079655807e827c7e5379012a7f' +
                '777c7e825980bc7c7e01007e7b02cf079302d0079657807e041976a914707501' +
                '537f77a97e0288ac7e7e6b7d02220258800317a9147e024c7472587d807e7e7e' +
                '01ab7e537901257f7702c3007f5c7f7701207f756b7ea97e01877e7c92647500' +
                '687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501537f' +
                '7768ac',
        );
    });

    it('AgoraPartial.script ALP 2,2 0x30313233', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0x30313233n,
            numTokenTruncBytes: 2,
            tokenScaleFactor: 0x12345678n,
            scaledTruncTokensPerTruncSat: 0x98765432n,
            numSatsTruncBytes: 2,
            minAcceptedScaledTruncTokens: 0x454647n,
            ...BASE_PARAMS_ALP,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(209);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c74534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504741475230075041525449414c0202785634' +
                '1200000000325476980000000047464500000000000300010203040506070809' +
                '0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f08e8a948e6cc4f6d03ab' +
                '7b63817b6ea2697603474645a2697604785634129700887d945279012a7f7578' +
                '92635359807e780478563412965667525968807e527904785634129654807e82' +
                '7c7e5379012a7f777c7e825980bc7c7e0200007e7b0531547698009305325476' +
                '98009656807e041976a914707501537f77a97e0288ac7e7e6b7d022202588003' +
                '17a9147e024c7472587d807e7e7e01ab7e537901257f7702d1007f5c7f770120' +
                '7f756b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7e' +
                'a86f7bbb7501c17e7c677501537f7768ac',
        );
    });

    it('AgoraPartial.script ALP 3,3 0x7fffffff', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0x7fffffffn,
            numTokenTruncBytes: 3,
            tokenScaleFactor: 0x7fffffffn,
            scaledTruncTokensPerTruncSat: 0x7fffffffn,
            numSatsTruncBytes: 3,
            minAcceptedScaledTruncTokens: 0x7fffffffn,
            ...BASE_PARAMS_ALP,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(212);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c74534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504741475230075041525449414c0303ffffff' +
                '7f00000000ffffff7f00000000ffffff7f000000000300010203040506070809' +
                '0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f0801000000ffffff3fab' +
                '7b63817b6ea2697604ffffff7fa2697604ffffff7f9700887d945279012a7f75' +
                '789263535a807e7804ffffff7f965667525a68807e527904ffffff7f96548053' +
                '7f757e827c7e5379012a7f777c7e825980bc7c7e030000007e7b04feffff7f93' +
                '04ffffff7f9655807e041976a914707501537f77a97e0288ac7e7e6b7d022202' +
                '58800317a9147e024c7472587d807e7e7e01ab7e537901257f7702d4007f5c7f' +
                '7701207f756b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144' +
                '807c7ea86f7bbb7501c17e7c677501537f7768ac',
        );
    });

    it('AgoraPartial.script ALP 3,4 0x7fff', () => {
        const agoraPartial = new AgoraPartial({
            truncTokens: 0x7fffn,
            numTokenTruncBytes: 3,
            tokenScaleFactor: 0x6fffn,
            scaledTruncTokensPerTruncSat: 0x5fffn,
            numSatsTruncBytes: 4,
            minAcceptedScaledTruncTokens: 0x4fffn,
            ...BASE_PARAMS_ALP,
            scriptLen: 0x7f,
        });
        agoraPartial.updateScriptLen();
        expect(agoraPartial.scriptLen).to.equal(201);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c74534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504741475230075041525449414c0304ff6f00' +
                '0000000000ff5f000000000000ff4f0000000000000300010203040506070809' +
                '0a0b0c0d0e0f101112131415161718191a1b1c1d1e1f080110ff3700000000ab' +
                '7b63817b6ea2697602ff4fa2697602ff6f9700887d945279012a7f7578926353' +
                '5a807e7802ff6f965667525a68807e527902ff6f965480537f757e827c7e5379' +
                '012a7f777c7e825980bc7c7e04000000007e7b02fe5f9302ff5f9654807e0419' +
                '76a914707501537f77a97e0288ac7e7e6b7d02220258800317a9147e024c7472' +
                '587d807e7e7e01ab7e537901257f7702c9007f5c7f7701207f756b7ea97e0187' +
                '7e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e' +
                '7c677501537f7768ac',
        );
    });
});
