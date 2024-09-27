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
    enforcedLockTime: 500000001,
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
        expect(agoraPartial.scriptLen).to.equal(208);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c78534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504b41475230075041525449414c000040420f' +
                '000000000040420f000000000040420f00000000000165cd1d03000102030405' +
                '060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f0800ca9a3b00' +
                '000000ab7b63817b6ea269760340420fa269760340420f9700887d945279012a' +
                '7f757892635357807e780340420f965667525768807e52790340420f9656807e' +
                '827c7e5379012a7f777c7e825980bc7c7e007e7b033f420f930340420f965880' +
                '7e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e02' +
                '4c7872587d807e7e7e01ab7e537901257f7702d0007f5c7f7701207f547f7504' +
                '0165cd1d886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144' +
                '807c7ea86f7bbb7501c17e7c677501577f7768ac',
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
        expect(agoraPartial.scriptLen).to.equal(203);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c78534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504b41475230075041525449414c0101d00700' +
                '0000000000d007000000000000d0070000000000000165cd1d03000102030405' +
                '060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f08002d310100' +
                '000000ab7b63817b6ea2697602d007a2697602d0079700887d945279012a7f75' +
                '7892635358807e7802d007965667525868807e527902d0079655807e827c7e53' +
                '79012a7f777c7e825980bc7c7e01007e7b02cf079302d0079657807e041976a9' +
                '14707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d' +
                '807e7e7e01ab7e537901257f7702cb007f5c7f7701207f547f75040165cd1d88' +
                '6b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f' +
                '7bbb7501c17e7c677501577f7768ac',
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
        expect(agoraPartial.scriptLen).to.equal(217);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c78534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504b41475230075041525449414c0202785634' +
                '1200000000325476980000000047464500000000000165cd1d03000102030405' +
                '060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f08e8a948e6cc' +
                '4f6d03ab7b63817b6ea2697603474645a2697604785634129700887d94527901' +
                '2a7f757892635359807e780478563412965667525968807e5279047856341296' +
                '54807e827c7e5379012a7f777c7e825980bc7c7e0200007e7b05315476980093' +
                '0532547698009656807e041976a914707501577f77a97e0288ac7e7e6b7d0222' +
                '0258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702d9007f5c' +
                '7f7701207f547f75040165cd1d886b7ea97e01877e7c92647500687b8292697e' +
                '6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac',
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
        expect(agoraPartial.scriptLen).to.equal(220);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c78534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504b41475230075041525449414c0303ffffff' +
                '7f00000000ffffff7f00000000ffffff7f000000000165cd1d03000102030405' +
                '060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f0801000000ff' +
                'ffff3fab7b63817b6ea2697604ffffff7fa2697604ffffff7f9700887d945279' +
                '012a7f75789263535a807e7804ffffff7f965667525a68807e527904ffffff7f' +
                '965480537f757e827c7e5379012a7f777c7e825980bc7c7e030000007e7b04fe' +
                'ffff7f9304ffffff7f9655807e041976a914707501577f77a97e0288ac7e7e6b' +
                '7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702dc' +
                '007f5c7f7701207f547f75040165cd1d886b7ea97e01877e7c92647500687b82' +
                '92697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac',
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
        expect(agoraPartial.scriptLen).to.equal(209);
        expect(toHex(agoraPartial.script().bytecode)).to.equal(
            '4c78534c5032000453454e448f8e8d8c8b8a898887868584838281807f7e7d7c' +
                '7b7a797877767574737271706a504b41475230075041525449414c0304ff6f00' +
                '0000000000ff5f000000000000ff4f0000000000000165cd1d03000102030405' +
                '060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f080110ff3700' +
                '000000ab7b63817b6ea2697602ff4fa2697602ff6f9700887d945279012a7f75' +
                '789263535a807e7802ff6f965667525a68807e527902ff6f965480537f757e82' +
                '7c7e5379012a7f777c7e825980bc7c7e04000000007e7b02fe5f9302ff5f9654' +
                '807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e' +
                '024c7872587d807e7e7e01ab7e537901257f7702d1007f5c7f7701207f547f75' +
                '040165cd1d886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa885201' +
                '44807c7ea86f7bbb7501c17e7c677501577f7768ac',
        );
    });
});
