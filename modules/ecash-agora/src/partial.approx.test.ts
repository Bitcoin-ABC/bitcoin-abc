// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { DEFAULT_DUST_LIMIT, SLP_FUNGIBLE } from 'ecash-lib';
import { AgoraPartial } from './partial.js';

const makerPk = new Uint8Array(33);

describe('Agora Partial Param Approximation', () => {
    const BASE_PARAMS_SLP = {
        makerPk,
        tokenId: '00'.repeat(32),
        tokenType: SLP_FUNGIBLE,
        tokenProtocol: 'SLP' as const,
        dustAmount: DEFAULT_DUST_LIMIT,
    };

    it('AgoraPartial.approximateParams 1 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1n,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 0x40000001n,
                scaledTruncTokensPerTruncSat: 0x40000001n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 0x40000001n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 2 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 2n,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 2n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 0x20000000n,
                scaledTruncTokensPerTruncSat: 0x20000000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 0x20000000n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(2n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(2n)).to.equal(2n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(2n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 0.001sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000n,
            priceNanoSatsPerToken: 1000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 1073742n,
                scaledTruncTokensPerTruncSat: 1073742000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 1073742n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000n,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2145336n,
                scaledTruncTokensPerTruncSat: 2145336n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 2145336n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1000n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000n,
            priceNanoSatsPerToken: 1000n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147481n,
                scaledTruncTokensPerTruncSat: 2147n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 2147481n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1001n);
        expect(params.askedSats(1000n)).to.equal(1000225n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1001000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000225000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000n,
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147342n,
                scaledTruncTokensPerTruncSat: 140728n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncTokens: 2147342n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1048576n);
        expect(params.askedSats(1000n)).to.equal(1000013824n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1048576000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000013824000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1000000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000n,
            priceNanoSatsPerToken: 1000000000n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147447n,
                scaledTruncTokensPerTruncSat: 36028n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncTokens: 2147447n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1006632960n);
        expect(params.askedSats(1000n)).to.equal(1000005959680n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1006632960000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(
            1000005959680000000n,
        );
    });

    it('AgoraPartial.approximateParams 1000000 for 0.001sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000n,
            priceNanoSatsPerToken: 1000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2145n,
                scaledTruncTokensPerTruncSat: 2145000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 2145n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1n);
        expect(params.askedSats(1000000n)).to.equal(1000n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(1000000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000n,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147n,
                scaledTruncTokensPerTruncSat: 2147n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 2147n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1000n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000n,
            priceNanoSatsPerToken: 1000n * 1000000000n,
            minAcceptedTokens: 200n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147n,
                scaledTruncTokensPerTruncSat: 549n,
                numSatsTruncBytes: 1,
                minAcceptedScaledTruncTokens: 429400n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(200n);
        expect(params.askedSats(1n)).to.equal(1024n);
        expect(params.askedSats(1000n)).to.equal(1001216n);
        expect(params.askedSats(1000000n)).to.equal(1001151232n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1001216000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(1001151232000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1000sat/token 64-bit', () => {
        const params = AgoraPartial.approximateParams(
            {
                offeredTokens: 1000000n,
                priceNanoSatsPerToken: 1000n * 1000000000n,
                minAcceptedTokens: 200n,
                ...BASE_PARAMS_SLP,
            },
            /*scriptIntegerBits=*/ 64n,
        );
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 9223372027631n,
                scaledTruncTokensPerTruncSat: 9223372027n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 1844674405526200n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(200n);
        expect(params.askedSats(1n)).to.equal(1001n);
        expect(params.askedSats(1000n)).to.equal(1000001n);
        expect(params.askedSats(1000000n)).to.equal(1000000001n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1001000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000001000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(1000000001000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000n,
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147n,
                scaledTruncTokensPerTruncSat: 140n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncTokens: 2147n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1048576n);
        expect(params.askedSats(1000n)).to.equal(1005060096n);
        expect(params.askedSats(1000000n)).to.equal(1005041418240n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1048576000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1005060096000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(
            1005041418240000n,
        );
    });

    it('AgoraPartial.approximateParams 1000000 for 1000000sat/token 64-bit', () => {
        const params = AgoraPartial.approximateParams(
            {
                offeredTokens: 1000000n,
                priceNanoSatsPerToken: 1000000n * 1000000000n,
                minAcceptedTokens: 1n,
                ...BASE_PARAMS_SLP,
            },
            /*scriptIntegerBits=*/ 64n,
        );
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 9223372036845n,
                scaledTruncTokensPerTruncSat: 9223372n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 9223372036845n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1000001n);
        expect(params.askedSats(1000n)).to.equal(1000000004n);
        expect(params.askedSats(1000000n)).to.equal(1000000003995n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000001000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000004000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(
            1000000003995000n,
        );
    });

    it('AgoraPartial.approximateParams 1000000 for 1000000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000n,
            priceNanoSatsPerToken: 1000000000n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 1000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2147n,
                scaledTruncTokensPerTruncSat: 36n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncTokens: 2147n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1006632960n);
        expect(params.askedSats(1000n)).to.equal(1000576385024n);
        expect(params.askedSats(1000000n)).to.equal(1000574522753024n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1006632960000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(
            1000576385024000000n,
        );
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(
            1000574522753024000n,
        );
    });

    it('AgoraPartial.approximateParams 1000000000 for 0.001sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000000n,
            priceNanoSatsPerToken: 1000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                // Price can be represented accurately, so no truncation
                truncTokens: 1000000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2n,
                scaledTruncTokensPerTruncSat: 2000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 2n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1n);
        expect(params.askedSats(1000000n)).to.equal(1000n);
        expect(params.askedSats(1000000000n)).to.equal(1000000n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(1000000n);
    });

    it('AgoraPartial.approximateParams 1000000000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000000n,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                // Price can be represented accurately, so no truncation
                truncTokens: 1000000000n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 2n,
                scaledTruncTokensPerTruncSat: 2n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncTokens: 2n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(1000000000n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1000n);
        expect(params.askedSats(1000000n)).to.equal(1000000n);
        expect(params.askedSats(1000000000n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(1000n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000000000 for 1000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000000n,
            priceNanoSatsPerToken: 1000n * 1000000000n,
            minAcceptedTokens: 100n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 15258n,
                numTokenTruncBytes: 2,
                tokenScaleFactor: 140742n,
                scaledTruncTokensPerTruncSat: 36029n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncTokens: 214n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(999948288n);
        expect(params.minAcceptedTokens()).to.equal(99n);
        expect(params.prepareAcceptedTokens(1000000n)).to.equal(983040n);
        expect(params.askedSats(983040n)).to.equal(989855744n);
        expect(params.prepareAcceptedTokens(1000000000n)).to.equal(999948288n);
        expect(params.askedSats(999948288n)).to.equal(999989182464n);
        expect(params.priceNanoSatsPerToken(0x10000n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerToken(0x80000n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(1006933333333n);
        expect(params.priceNanoSatsPerToken(10000000n)).to.equal(
            1000421052631n,
        );
        expect(params.priceNanoSatsPerToken(100000000n)).to.equal(
            1000162622950n,
        );
        expect(params.priceNanoSatsPerToken(1000000000n)).to.equal(
            1000040896578n,
        );
    });

    it('AgoraPartial.approximateParams 1000000000 for 1000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 1000000000n,
            priceNanoSatsPerToken: 1000000n * 1000000000n,
            minAcceptedTokens: 100n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 15258n,
                numTokenTruncBytes: 2,
                tokenScaleFactor: 140744n,
                scaledTruncTokensPerTruncSat: 9223n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncTokens: 214n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(999948288n);
        expect(params.minAcceptedTokens()).to.equal(99n);
        expect(params.prepareAcceptedTokens(1000000n)).to.equal(983040n);
        expect(params.askedSats(983040n)).to.equal(983547510784n);
        expect(params.prepareAcceptedTokens(1000000000n)).to.equal(999948288n);
        expect(params.askedSats(999948288n)).to.equal(1000035890233344n);
        expect(params.priceNanoSatsPerToken(0x10000n)).to.equal(
            1048576000000000n,
        );
        expect(params.priceNanoSatsPerToken(0x20000n)).to.equal(
            1015808000000000n,
        );
        expect(params.priceNanoSatsPerToken(0x80000n)).to.equal(
            1007616000000000n,
        );
        expect(params.priceNanoSatsPerToken(1000000n)).to.equal(
            1000516266666666n,
        );
        expect(params.priceNanoSatsPerToken(10000000n)).to.equal(
            1000286315789473n,
        );
        expect(params.priceNanoSatsPerToken(100000000n)).to.equal(
            1000100847213114n,
        );
        expect(params.priceNanoSatsPerToken(1000000000n)).to.equal(
            1000087606763664n,
        );
    });

    it('AgoraPartial.approximateParams 0x100000000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 0x100000000n,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 4n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0x1000000n,
                numTokenTruncBytes: 1,
                tokenScaleFactor: 127n,
                scaledTruncTokensPerTruncSat: 127n,
                numSatsTruncBytes: 1,
                minAcceptedScaledTruncTokens: 1n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(0x100000000n);
        expect(params.minAcceptedTokens()).to.equal(2n);
        expect(params.askedSats(0x100n)).to.equal(0x100n);
        expect(params.askedSats(0x100000000n)).to.equal(0x100000000n);
        expect(params.priceNanoSatsPerToken(0x100n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerToken(0x100000000n)).to.equal(
            1000000000n,
        );
    });

    it('Agora Partial SLP Approximation 2p64-1, small price', () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 0xffffffffffffffffn,
            priceNanoSatsPerToken: 40n,
            minAcceptedTokens: 0xffffffffffffn,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0xffffffn,
                numTokenTruncBytes: 5,
                tokenScaleFactor: 127n,
                scaledTruncTokensPerTruncSat: 189n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncTokens: 32511n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(0xffffff0000000000n);
        expect(params.askedSats(0x10000000000n)).to.equal(65536n);
        expect(params.priceNanoSatsPerToken(0x10000000000n)).to.equal(59n);
        expect(params.askedSats(0xffffff0000000000n)).to.equal(738825273344n);
        expect(params.priceNanoSatsPerToken(0xffffff0000000000n)).to.equal(40n);
        expect(params.priceNanoSatsPerToken()).to.equal(40n);
    });

    it('AgoraPartial.approximateParams 2p64-1, big price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 0xffffffffffffffffn,
            priceNanoSatsPerToken: 500000000n,
            minAcceptedTokens: 0xffffffffffn,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0xffffffn,
                numTokenTruncBytes: 5,
                tokenScaleFactor: 128n,
                scaledTruncTokensPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncTokens: 0x7fn,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(0xffffff0000000000n);
        expect(params.askedSats(0x10000000000n)).to.equal(549755813888n);
        expect(params.priceNanoSatsPerToken(0x10000000000n)).to.equal(
            500000000n,
        );
        expect(params.askedSats(0xffffff0000000000n)).to.equal(
            9223371487098961920n,
        );
        expect(params.priceNanoSatsPerToken(0xffffff0000000000n)).to.equal(
            500000000n,
        );
        expect(params.priceNanoSatsPerToken()).to.equal(500000000n);
    });

    it('AgoraPartial.approximateParams 2p63-1, small price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 0x7fffffffffffffffn,
            priceNanoSatsPerToken: 80n,
            minAcceptedTokens: 0xffffffffffffn,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0x7fffff42n,
                numTokenTruncBytes: 4,
                tokenScaleFactor: 1n,
                scaledTruncTokensPerTruncSat: 190n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncTokens: 0xffffn,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(0x7fffff4200000000n);
        expect(params.askedSats(0x100000000n)).to.equal(65536n);
        expect(params.priceNanoSatsPerToken(0x100000000n)).to.equal(15258n);
        expect(params.askedSats(0x7fffff4200000000n)).to.equal(740723589120n);
        expect(params.priceNanoSatsPerToken(0x7fffff4200000000n)).to.equal(80n);
        expect(params.priceNanoSatsPerToken()).to.equal(80n);
    });

    it('AgoraPartial.approximateParams 2p63-1, big price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 0x7fffffffffffffffn,
            priceNanoSatsPerToken: 1000000000n,
            minAcceptedTokens: 0x100000000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 0x7fffffffn,
                numTokenTruncBytes: 4,
                tokenScaleFactor: 1n,
                scaledTruncTokensPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncTokens: 1n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(0x7fffffff00000000n);
        expect(params.askedSats(0x100000000n)).to.equal(4294967296n);
        expect(params.priceNanoSatsPerToken(0x100000000n)).to.equal(
            1000000000n,
        );
        expect(params.askedSats(0x7fffffff00000000n)).to.equal(
            9223372032559808512n,
        );
        expect(params.priceNanoSatsPerToken(0x7fffffff00000000n)).to.equal(
            1000000000n,
        );
        expect(params.priceNanoSatsPerToken()).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 100, big price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 100n,
            priceNanoSatsPerToken: 7123456780n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 100n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 0x7fff3a28n / 100n,
                scaledTruncTokensPerTruncSat: 50576n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncTokens: 0x7fff3a28n / 100n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(100n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(7130316800n);
        expect(params.askedSats(2n)).to.equal(7130316800n * 2n);
        expect(params.askedSats(3n)).to.equal(7124724394n * 3n + 2n);
        expect(params.askedSats(4n)).to.equal(7126122496n * 4n);
        expect(params.askedSats(5n)).to.equal(71236059136n / 2n);
        expect(params.askedSats(10n)).to.equal(71236059136n);
        expect(params.askedSats(100n)).to.equal(712360591360n);
    });

    it('AgoraPartial.approximateParams 100, bigger price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredTokens: 100n,
            priceNanoSatsPerToken: 712345678000n * 1000000000n,
            minAcceptedTokens: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncTokens: 100n,
                numTokenTruncBytes: 0,
                tokenScaleFactor: 0x7ffe05f4n / 100n,
                scaledTruncTokensPerTruncSat: 129471n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncTokens: 0x7ffe05f4n / 100n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredTokens()).to.equal(100n);
        expect(params.minAcceptedTokens()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(712964571136n);
        expect(params.askedSats(10n)).to.equal(7125350744064n);
        expect(params.askedSats(100n)).to.equal(71236327571456n);
    });

    it('AgoraPartial.approximateParams failure', () => {
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 0n,
                priceNanoSatsPerToken: 0n,
                minAcceptedTokens: 0n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('offeredTokens must be at least 1');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 1n,
                priceNanoSatsPerToken: 0n,
                minAcceptedTokens: 0n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('priceNanoSatsPerToken must be at least 1');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 1n,
                priceNanoSatsPerToken: 1n,
                minAcceptedTokens: 0n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('minAcceptedTokens must be at least 1');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 0x10000000000000000n,
                priceNanoSatsPerToken: 1n,
                minAcceptedTokens: 1n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('For SLP, offeredTokens can be at most 0xffffffffffffffff');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 0x1000000000000n,
                priceNanoSatsPerToken: 1n,
                minAcceptedTokens: 1n,
                ...BASE_PARAMS_SLP,
                tokenProtocol: 'ALP',
            }),
        ).to.throw('For ALP, offeredTokens can be at most 0xffffffffffff');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 1n,
                priceNanoSatsPerToken: 1n,
                minAcceptedTokens: 1n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('Parameters cannot be represented in Script');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 0x100000000n,
                priceNanoSatsPerToken: 1000000000n,
                minAcceptedTokens: 1n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('minAcceptedTokens too small, got truncated to 0');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredTokens: 0x100000000n,
                priceNanoSatsPerToken: 1000000000n,
                minAcceptedTokens: 100n,
                ...BASE_PARAMS_SLP,
            }).askedSats(1n),
        ).to.throw(
            'acceptedTokens must have the last 8 bits set to zero, use ' +
                'prepareAcceptedTokens to get a valid amount',
        );
    });
});
