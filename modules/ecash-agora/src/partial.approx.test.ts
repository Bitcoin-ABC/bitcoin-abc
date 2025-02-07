// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { ALP_STANDARD, DEFAULT_DUST_SATS, SLP_FUNGIBLE } from 'ecash-lib';
import { AgoraPartial } from './partial.js';

const makerPk = new Uint8Array(33);

describe('Agora Partial Param Approximation', () => {
    const BASE_PARAMS_SLP = {
        makerPk,
        tokenId: '00'.repeat(32),
        tokenType: SLP_FUNGIBLE,
        tokenProtocol: 'SLP' as const,
        enforcedLockTime: 1234,
        dustSats: DEFAULT_DUST_SATS,
    };
    const BASE_PARAMS_ALP = {
        makerPk,
        tokenId: '00'.repeat(32),
        tokenType: ALP_STANDARD,
        tokenProtocol: 'ALP' as const,
        enforcedLockTime: 1234,
        dustSats: DEFAULT_DUST_SATS,
    };

    it('AgoraPartial.approximateParams 546 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 546n,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 546n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 546n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 3925916n,
                scaledTruncAtomsPerTruncSat: 3925916n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 2143550136n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(546n);
        expect(params.minAcceptedAtoms()).to.equal(546n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1092 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1092n,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 546n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1092n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 1964759n,
                scaledTruncAtomsPerTruncSat: 1964759n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 1072758414n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1092n);
        expect(params.minAcceptedAtoms()).to.equal(546n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(2n)).to.equal(2n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(2n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 0.001sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000n,
            priceNanoSatsPerAtom: 1000000n,
            minAcceptedAtoms: 1000n,
            ...BASE_PARAMS_SLP,
            dustSats: 1n,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 1073742n,
                scaledTruncAtomsPerTruncSat: 1073742000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 1073742000n,
                ...BASE_PARAMS_SLP,
                dustSats: 1n,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000n);
        expect(params.minAcceptedAtoms()).to.equal(1000n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000n,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 546n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2145336n,
                scaledTruncAtomsPerTruncSat: 2145336n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 1171353456n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000n);
        expect(params.minAcceptedAtoms()).to.equal(546n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1000n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000n,
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2147481n,
                scaledTruncAtomsPerTruncSat: 2147n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 2147481n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000n);
        expect(params.minAcceptedAtoms()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1001n);
        expect(params.askedSats(1000n)).to.equal(1000225n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1001000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000225000000n);
    });

    it('AgoraPartial.approximateParams 1 BUX', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 10000n,
            priceNanoSatsPerAtom: 291970802919n, // $0.0001 / token @ $0.00003425 / XEC
            minAcceptedAtoms: 100n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 10000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 214748n,
                scaledTruncAtomsPerTruncSat: 735n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 21474800n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(10000n);
        expect(params.minAcceptedAtoms()).to.equal(100n);
        expect(params.askedSats(100n)).to.equal(29218n);
        expect(params.askedSats(10000n)).to.equal(2921742n);
        expect(params.priceNanoSatsPerAtom(100n)).to.equal(292180000000n);
        expect(params.priceNanoSatsPerAtom(10000n)).to.equal(292174200000n);
    });

    it('AgoraPartial.approximateParams 50 BUX', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 500000n,
            priceNanoSatsPerAtom: 291970802919n, // $0.0001 / token
            minAcceptedAtoms: 10000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1953n,
                numAtomsTruncBytes: 1,
                atomsScaleFactor: 1099580n,
                scaledTruncAtomsPerTruncSat: 3766n,
                numSatsTruncBytes: 1,
                minAcceptedScaledTruncAtoms: 42952343n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(499968n);
        expect(params.minAcceptedAtoms()).to.equal(10240n);
        expect(params.askedSats(9984n)).to.equal(2915328n);
        expect(params.askedSats(499968n)).to.equal(145978624n);
        expect(params.priceNanoSatsPerAtom(9984n)).to.equal(292000000000n);
        expect(params.priceNanoSatsPerAtom(499968n)).to.equal(291975934459n);
    });

    it('AgoraPartial.approximateParams 1000 BUX', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 10000000n,
            priceNanoSatsPerAtom: 291970802919n, // $0.0001 / token
            minAcceptedAtoms: 10000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 39062n,
                numAtomsTruncBytes: 1,
                atomsScaleFactor: 54976n,
                scaledTruncAtomsPerTruncSat: 188n,
                numSatsTruncBytes: 1,
                minAcceptedScaledTruncAtoms: 2147500n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(9999872n);
        expect(params.minAcceptedAtoms()).to.equal(10240n);
        expect(params.askedSats(9984n)).to.equal(2919680n);
        expect(params.askedSats(499968n)).to.equal(146203648n);
        expect(params.priceNanoSatsPerAtom(9984n)).to.equal(292435897435n);
        expect(params.priceNanoSatsPerAtom(499968n)).to.equal(292426011264n);
    });

    it('AgoraPartial.approximateParams 10000 BUX', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 100000000n,
            priceNanoSatsPerAtom: 291970802919n, // $0.0001 / token
            minAcceptedAtoms: 100000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1525n,
                numAtomsTruncBytes: 2,
                atomsScaleFactor: 1408182n,
                scaledTruncAtomsPerTruncSat: 4823n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 2148715n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(99942400n);
        expect(params.minAcceptedAtoms()).to.equal(131072n);
        expect(params.askedSats(131072n)).to.equal(38273024n);
        expect(params.askedSats(9961472n)).to.equal(2908487680n);
        expect(params.priceNanoSatsPerAtom(131072n)).to.equal(292000000000n);
        expect(params.priceNanoSatsPerAtom(9961472n)).to.equal(291973684210n);
    });

    it('AgoraPartial.approximateParams 1000 for 1000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000n,
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2147342n,
                scaledTruncAtomsPerTruncSat: 140728n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 2147342n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000n);
        expect(params.minAcceptedAtoms()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1048576n);
        expect(params.askedSats(1000n)).to.equal(1000013824n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1048576000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000013824000000n);
    });

    it('AgoraPartial.approximateParams 1000 for 1000000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000n,
            priceNanoSatsPerAtom: 1000000000n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2147447n,
                scaledTruncAtomsPerTruncSat: 36028n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncAtoms: 2147447n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000n);
        expect(params.minAcceptedAtoms()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1006632960n);
        expect(params.askedSats(1000n)).to.equal(1000005959680n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1006632960000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(
            1000005959680000000n,
        );
    });

    it('AgoraPartial.approximateParams 1000000 for 0.001sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000n,
            priceNanoSatsPerAtom: 1000000n,
            minAcceptedAtoms: 1000n,
            ...BASE_PARAMS_SLP,
            dustSats: 1n,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2145n,
                scaledTruncAtomsPerTruncSat: 2145000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 2145000n,
                ...BASE_PARAMS_SLP,
                dustSats: 1n,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000000n);
        expect(params.minAcceptedAtoms()).to.equal(1000n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1n);
        expect(params.askedSats(1000000n)).to.equal(1000n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000n);
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(1000000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000n,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 5460n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2147n,
                scaledTruncAtomsPerTruncSat: 2147n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 11722620n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000000n);
        expect(params.minAcceptedAtoms()).to.equal(5460n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1000n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000n,
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            minAcceptedAtoms: 200n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 3906n,
                numAtomsTruncBytes: 1,
                atomsScaleFactor: 549754n,
                scaledTruncAtomsPerTruncSat: 140737n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 429495n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(999936n);
        expect(params.minAcceptedAtoms()).to.equal(256n);
        expect(params.askedSats(256n)).to.equal(262144n);
        expect(params.askedSats(1024n)).to.equal(1048576n);
        expect(params.askedSats(999936n)).to.equal(999948288n);
        expect(params.priceNanoSatsPerAtom(256n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerAtom(1024n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerAtom(999936n)).to.equal(1000012288786n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1000sat/token 64-bit', () => {
        const params = AgoraPartial.approximateParams(
            {
                offeredAtoms: 1000000n,
                priceNanoSatsPerAtom: 1000n * 1000000000n,
                minAcceptedAtoms: 200n,
                ...BASE_PARAMS_SLP,
            },
            /*scriptIntegerBits=*/ 64n,
        );
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 9223372027631n,
                scaledTruncAtomsPerTruncSat: 9223372027n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 1844674405526200n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000000n);
        expect(params.minAcceptedAtoms()).to.equal(200n);
        expect(params.askedSats(1n)).to.equal(1001n);
        expect(params.askedSats(1000n)).to.equal(1000001n);
        expect(params.askedSats(1000000n)).to.equal(1000000001n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1001000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000001000000n);
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(1000000001000n);
    });

    it('AgoraPartial.approximateParams 1000000 for 1000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000n,
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            minAcceptedAtoms: 1000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 3906n,
                numAtomsTruncBytes: 1,
                atomsScaleFactor: 549781n,
                scaledTruncAtomsPerTruncSat: 36030n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncAtoms: 2147582n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(999936n);
        expect(params.minAcceptedAtoms()).to.equal(1024n);
        expect(params.askedSats(1024n)).to.equal(1040187392n);
        expect(params.askedSats(999936n)).to.equal(999955628032n);
        expect(params.priceNanoSatsPerAtom(1024n)).to.equal(1015808000000000n);
        expect(params.priceNanoSatsPerAtom(999936n)).to.equal(
            1000019629288274n,
        );
    });

    it('AgoraPartial.approximateParams 1000000 for 1000000sat/token 64-bit', () => {
        const params = AgoraPartial.approximateParams(
            {
                offeredAtoms: 1000000n,
                priceNanoSatsPerAtom: 1000000n * 1000000000n,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_SLP,
            },
            /*scriptIntegerBits=*/ 64n,
        );
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 1000000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 9223372036845n,
                scaledTruncAtomsPerTruncSat: 9223372n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 9223372036845n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000000n);
        expect(params.minAcceptedAtoms()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(1000001n);
        expect(params.askedSats(1000n)).to.equal(1000000004n);
        expect(params.askedSats(1000000n)).to.equal(1000000003995n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000001000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000004000000n);
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(
            1000000003995000n,
        );
    });

    it('AgoraPartial.approximateParams 1000000 for 1000000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000n,
            priceNanoSatsPerAtom: 1000000000n * 1000000000n,
            minAcceptedAtoms: 1000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 3906n,
                numAtomsTruncBytes: 1,
                atomsScaleFactor: 549788n,
                scaledTruncAtomsPerTruncSat: 9223n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 2147609n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(999936n);
        expect(params.minAcceptedAtoms()).to.equal(1024n);
        expect(params.askedSats(1024n)).to.equal(1026497183744n);
        expect(params.askedSats(999936n)).to.equal(1000035890233344n);
        expect(params.priceNanoSatsPerAtom(1024n)).to.equal(
            1002438656000000000n,
        );
        expect(params.priceNanoSatsPerAtom(999936n)).to.equal(
            1000099896626728110n,
        );
    });

    it('AgoraPartial.approximateParams 1000000000 for 0.001sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000000n,
            priceNanoSatsPerAtom: 1000000n,
            minAcceptedAtoms: 546000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                // Price can be represented accurately, so no truncation
                truncAtoms: 1000000000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2n,
                scaledTruncAtomsPerTruncSat: 2000n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 1092000n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000000000n);
        expect(params.minAcceptedAtoms()).to.equal(546000n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1n);
        expect(params.askedSats(1000000n)).to.equal(1000n);
        expect(params.askedSats(1000000000n)).to.equal(1000000n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000n);
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(1000000n);
    });

    it('AgoraPartial.approximateParams 1000000000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000000n,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 546n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                // Price can be represented accurately, so no truncation
                truncAtoms: 1000000000n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 2n,
                scaledTruncAtomsPerTruncSat: 2n,
                numSatsTruncBytes: 0,
                minAcceptedScaledTruncAtoms: 1092n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(1000000000n);
        expect(params.minAcceptedAtoms()).to.equal(546n);
        expect(params.askedSats(1n)).to.equal(1n);
        expect(params.askedSats(1000n)).to.equal(1000n);
        expect(params.askedSats(1000000n)).to.equal(1000000n);
        expect(params.askedSats(1000000000n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(1000n)).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 1000000000 for 1000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000000n,
            priceNanoSatsPerAtom: 1000n * 1000000000n,
            minAcceptedAtoms: 100n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 15258n,
                numAtomsTruncBytes: 2,
                atomsScaleFactor: 140742n,
                scaledTruncAtomsPerTruncSat: 36029n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncAtoms: 214n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(999948288n);
        // Note this is >> than minAcceptedAtoms set in approximateParams
        // It is, though, in practice, what a buy would have to be
        expect(params.minAcceptedAtoms()).to.equal(65536n);
        expect(params.prepareAcceptedAtoms(1000000n)).to.equal(983040n);
        expect(params.askedSats(983040n)).to.equal(989855744n);
        expect(params.prepareAcceptedAtoms(1000000000n)).to.equal(999948288n);
        expect(params.askedSats(999948288n)).to.equal(999989182464n);
        expect(params.priceNanoSatsPerAtom(0x10000n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerAtom(0x80000n)).to.equal(1024000000000n);
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(1006933333333n);
        expect(params.priceNanoSatsPerAtom(10000000n)).to.equal(1000421052631n);
        expect(params.priceNanoSatsPerAtom(100000000n)).to.equal(
            1000162622950n,
        );
        expect(params.priceNanoSatsPerAtom(1000000000n)).to.equal(
            1000040896578n,
        );
    });

    it('AgoraPartial.approximateParams 1000000000 for 1000000sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 1000000000n,
            priceNanoSatsPerAtom: 1000000n * 1000000000n,
            minAcceptedAtoms: 100n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 15258n,
                numAtomsTruncBytes: 2,
                atomsScaleFactor: 140744n,
                scaledTruncAtomsPerTruncSat: 9223n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 214n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(999948288n);
        // Note this is >> than minAcceptedAtoms set in approximateParams
        // It is, though, in practice, what a buy would have to be
        expect(params.minAcceptedAtoms()).to.equal(65536n);
        expect(params.prepareAcceptedAtoms(1000000n)).to.equal(983040n);
        expect(params.askedSats(983040n)).to.equal(983547510784n);
        expect(params.prepareAcceptedAtoms(1000000000n)).to.equal(999948288n);
        expect(params.askedSats(999948288n)).to.equal(1000035890233344n);
        expect(params.priceNanoSatsPerAtom(0x10000n)).to.equal(
            1048576000000000n,
        );
        expect(params.priceNanoSatsPerAtom(0x20000n)).to.equal(
            1015808000000000n,
        );
        expect(params.priceNanoSatsPerAtom(0x80000n)).to.equal(
            1007616000000000n,
        );
        expect(params.priceNanoSatsPerAtom(1000000n)).to.equal(
            1000516266666666n,
        );
        expect(params.priceNanoSatsPerAtom(10000000n)).to.equal(
            1000286315789473n,
        );
        expect(params.priceNanoSatsPerAtom(100000000n)).to.equal(
            1000100847213114n,
        );
        expect(params.priceNanoSatsPerAtom(1000000000n)).to.equal(
            1000087606763664n,
        );
    });

    it('AgoraPartial.approximateParams 0x100000000 for 1sat/token', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 0x100000000n,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 546n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x1000000n,
                numAtomsTruncBytes: 1,
                atomsScaleFactor: 127n,
                scaledTruncAtomsPerTruncSat: 127n,
                numSatsTruncBytes: 1,
                minAcceptedScaledTruncAtoms: 270n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(0x100000000n);
        expect(params.minAcceptedAtoms()).to.equal(768n);
        expect(params.askedSats(0x100n)).to.equal(0x100n);
        expect(params.askedSats(0x100000000n)).to.equal(0x100000000n);
        expect(params.priceNanoSatsPerAtom(0x100n)).to.equal(1000000000n);
        expect(params.priceNanoSatsPerAtom(0x100000000n)).to.equal(1000000000n);
    });

    it('Agora Partial SLP Approximation 2p64-1, small price', () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 0xffffffffffffffffn,
            priceNanoSatsPerAtom: 40n,
            minAcceptedAtoms: 0xffffffffffffn,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 5,
                atomsScaleFactor: 127n,
                scaledTruncAtomsPerTruncSat: 189n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 32511n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(0xffffff0000000000n);
        expect(params.askedSats(0x10000000000n)).to.equal(65536n);
        expect(params.priceNanoSatsPerAtom(0x10000000000n)).to.equal(59n);
        expect(params.askedSats(0xffffff0000000000n)).to.equal(738825273344n);
        expect(params.priceNanoSatsPerAtom(0xffffff0000000000n)).to.equal(40n);
        expect(params.priceNanoSatsPerAtom()).to.equal(40n);
    });

    it('AgoraPartial.approximateParams 2p64-1, big price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 0xffffffffffffffffn,
            priceNanoSatsPerAtom: 500000000n,
            minAcceptedAtoms: 0xffffffffffn,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 5,
                atomsScaleFactor: 128n,
                scaledTruncAtomsPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 0x7fn,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(0xffffff0000000000n);
        expect(params.askedSats(0x10000000000n)).to.equal(549755813888n);
        expect(params.priceNanoSatsPerAtom(0x10000000000n)).to.equal(
            500000000n,
        );
        expect(params.askedSats(0xffffff0000000000n)).to.equal(
            9223371487098961920n,
        );
        expect(params.priceNanoSatsPerAtom(0xffffff0000000000n)).to.equal(
            500000000n,
        );
        expect(params.priceNanoSatsPerAtom()).to.equal(500000000n);
    });

    it('AgoraPartial.approximateParams 2p63-1, small price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 0x7fffffffffffffffn,
            priceNanoSatsPerAtom: 80n,
            minAcceptedAtoms: 0xffffffffffffn,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffff42n,
                numAtomsTruncBytes: 4,
                atomsScaleFactor: 1n,
                scaledTruncAtomsPerTruncSat: 190n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 0xffffn,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(0x7fffff4200000000n);
        expect(params.askedSats(0x100000000n)).to.equal(65536n);
        expect(params.priceNanoSatsPerAtom(0x100000000n)).to.equal(15258n);
        expect(params.askedSats(0x7fffff4200000000n)).to.equal(740723589120n);
        expect(params.priceNanoSatsPerAtom(0x7fffff4200000000n)).to.equal(80n);
        expect(params.priceNanoSatsPerAtom()).to.equal(80n);
    });

    it('AgoraPartial.approximateParams 2p63-1, big price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 0x7fffffffffffffffn,
            priceNanoSatsPerAtom: 1000000000n,
            minAcceptedAtoms: 0x100000000n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffffffn,
                numAtomsTruncBytes: 4,
                atomsScaleFactor: 1n,
                scaledTruncAtomsPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 1n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(0x7fffffff00000000n);
        expect(params.askedSats(0x100000000n)).to.equal(4294967296n);
        expect(params.priceNanoSatsPerAtom(0x100000000n)).to.equal(1000000000n);
        expect(params.askedSats(0x7fffffff00000000n)).to.equal(
            9223372032559808512n,
        );
        expect(params.priceNanoSatsPerAtom(0x7fffffff00000000n)).to.equal(
            1000000000n,
        );
        expect(params.priceNanoSatsPerAtom()).to.equal(1000000000n);
    });

    it('AgoraPartial.approximateParams 100, big price', async () => {
        const params = AgoraPartial.approximateParams({
            offeredAtoms: 100n,
            priceNanoSatsPerAtom: 7123456780n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 100n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 0x7fff3a28n / 100n,
                scaledTruncAtomsPerTruncSat: 50576n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncAtoms: 0x7fff3a28n / 100n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(100n);
        expect(params.minAcceptedAtoms()).to.equal(1n);
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
            offeredAtoms: 100n,
            priceNanoSatsPerAtom: 712345678000n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_SLP,
        });
        expect(params).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 100n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 0x7ffe05f4n / 100n,
                scaledTruncAtomsPerTruncSat: 129471n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 0x7ffe05f4n / 100n,
                ...BASE_PARAMS_SLP,
                scriptLen: params.scriptLen,
            }),
        );
        expect(params.offeredAtoms()).to.equal(100n);
        expect(params.minAcceptedAtoms()).to.equal(1n);
        expect(params.askedSats(1n)).to.equal(712964571136n);
        expect(params.askedSats(10n)).to.equal(7125350744064n);
        expect(params.askedSats(100n)).to.equal(71236327571456n);
    });

    it('AgoraPartial.approximateParams ALP 7450M XEC vs 2p48-1, small price', async () => {
        const agoraPartial = AgoraPartial.approximateParams({
            offeredAtoms: 0xffffffffffffn,
            priceNanoSatsPerAtom: 2600000n,
            minAcceptedAtoms: 0xffffffffn,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 3,
                atomsScaleFactor: 127n,
                scaledTruncAtomsPerTruncSat: 190n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 32511n,
                ...BASE_PARAMS_ALP,
                scriptLen: agoraPartial.scriptLen,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0xffffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x1000000n)).to.equal(
            3906250n,
        );
        expect(agoraPartial.askedSats(0xffffff000000n)).to.equal(734936694784n);
        expect(agoraPartial.priceNanoSatsPerAtom(0xffffff000000n)).to.equal(
            2611019n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(2611019n);
    });

    it('AgoraPartial.approximateParams ALP 7450M XEC vs 2p48-1, big price', async () => {
        const agoraPartial = AgoraPartial.approximateParams({
            offeredAtoms: 0xffffffffffffn,
            priceNanoSatsPerAtom: 30000000000000n,
            minAcceptedAtoms: 0x1000000n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0xffffffn,
                numAtomsTruncBytes: 3,
                atomsScaleFactor: 128n,
                scaledTruncAtomsPerTruncSat: 1n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 128n,
                ...BASE_PARAMS_ALP,
                scriptLen: agoraPartial.scriptLen,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0xffffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x1000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.askedSats(0xffffff000000n)).to.equal(
            9223371487098961920n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0xffffff000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(32768000000000n);
    });

    it('AgoraPartial.approximateParams ALP 7450M XEC vs 2p47-1, small price', async () => {
        const agoraPartial = AgoraPartial.approximateParams({
            offeredAtoms: 0x7fffffffffffn,
            priceNanoSatsPerAtom: 5000000n,
            minAcceptedAtoms: 0xffffffffn,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffff38n,
                numAtomsTruncBytes: 2,
                atomsScaleFactor: 1n,
                scaledTruncAtomsPerTruncSat: 200n,
                numSatsTruncBytes: 2,
                minAcceptedScaledTruncAtoms: 0xffffn,
                ...BASE_PARAMS_ALP,
                scriptLen: agoraPartial.scriptLen,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0x7fffff380000n);
        expect(agoraPartial.askedSats(0x10000n)).to.equal(65536n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x10000n)).to.equal(
            1000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffff380000n)).to.equal(703687426048n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x7fffff380000n)).to.equal(
            5000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(5000000n);
    });

    it('AgoraPartial.approximateParams ALP 7450M XEC vs 2p47-1, big price', async () => {
        const agoraPartial = AgoraPartial.approximateParams({
            offeredAtoms: 0x7fffffffffffn,
            priceNanoSatsPerAtom: 32000000000000n,
            minAcceptedAtoms: 0x1000000n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 0x7fffffn,
                numAtomsTruncBytes: 3,
                atomsScaleFactor: 256n,
                scaledTruncAtomsPerTruncSat: 2n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 256n,
                ...BASE_PARAMS_ALP,
                scriptLen: agoraPartial.scriptLen,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(0x7fffff000000n);
        expect(agoraPartial.askedSats(0x1000000n)).to.equal(549755813888n);
        expect(agoraPartial.priceNanoSatsPerAtom(0x1000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.askedSats(0x7fffff000000n)).to.equal(
            4611685468671574016n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom(0x7fffff000000n)).to.equal(
            32768000000000n,
        );
        expect(agoraPartial.priceNanoSatsPerAtom()).to.equal(32768000000000n);
    });

    it('AgoraPartial.approximateParams ALP 7450M XEC vs 100, small price', async () => {
        const agoraPartial = AgoraPartial.approximateParams({
            offeredAtoms: 100n,
            priceNanoSatsPerAtom: 7123456780n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 100n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 0x7fff3a28n / 100n,
                scaledTruncAtomsPerTruncSat: 50576n,
                numSatsTruncBytes: 3,
                minAcceptedScaledTruncAtoms: 0x7fff3a28n / 100n,
                ...BASE_PARAMS_ALP,
                scriptLen: agoraPartial.scriptLen,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(100n);
        expect(agoraPartial.minAcceptedAtoms()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(7130316800n);
        expect(agoraPartial.askedSats(2n)).to.equal(7130316800n * 2n);
        expect(agoraPartial.askedSats(3n)).to.equal(7124724394n * 3n + 2n);
        expect(agoraPartial.askedSats(4n)).to.equal(7126122496n * 4n);
        expect(agoraPartial.askedSats(5n)).to.equal(71236059136n / 2n);
        expect(agoraPartial.askedSats(10n)).to.equal(71236059136n);
        expect(agoraPartial.askedSats(100n)).to.equal(712360591360n);
    });

    it('AgoraPartial.approximateParams ALP 7450M XEC vs 100, big price', async () => {
        const agoraPartial = AgoraPartial.approximateParams({
            offeredAtoms: 100n,
            priceNanoSatsPerAtom: 712345678000n * 1000000000n,
            minAcceptedAtoms: 1n,
            ...BASE_PARAMS_ALP,
        });
        expect(agoraPartial).to.deep.equal(
            new AgoraPartial({
                truncAtoms: 100n,
                numAtomsTruncBytes: 0,
                atomsScaleFactor: 0x7ffe05f4n / 100n,
                scaledTruncAtomsPerTruncSat: 129471n,
                numSatsTruncBytes: 4,
                minAcceptedScaledTruncAtoms: 0x7ffe05f4n / 100n,
                ...BASE_PARAMS_ALP,
                scriptLen: agoraPartial.scriptLen,
            }),
        );
        expect(agoraPartial.offeredAtoms()).to.equal(100n);
        expect(agoraPartial.minAcceptedAtoms()).to.equal(1n);
        expect(agoraPartial.askedSats(1n)).to.equal(712964571136n);
        expect(agoraPartial.askedSats(10n)).to.equal(7125350744064n);
        expect(agoraPartial.askedSats(100n)).to.equal(71236327571456n);
    });

    it('AgoraPartial.approximateParams failure', () => {
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 0n,
                priceNanoSatsPerAtom: 0n,
                minAcceptedAtoms: 0n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('offeredAtoms must be at least 1');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 1n,
                priceNanoSatsPerAtom: 0n,
                minAcceptedAtoms: 0n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('priceNanoSatsPerAtom must be at least 1');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 1n,
                priceNanoSatsPerAtom: 1n,
                minAcceptedAtoms: 0n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('minAcceptedAtoms must be at least 1');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 0x10000000000000000n,
                priceNanoSatsPerAtom: 1n,
                minAcceptedAtoms: 546000000000n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('For SLP, offeredAtoms can be at most 0xffffffffffffffff');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 0x1000000000000n,
                priceNanoSatsPerAtom: 1n,
                minAcceptedAtoms: 546000000000n,
                ...BASE_PARAMS_SLP,
                tokenProtocol: 'ALP',
            }),
        ).to.throw('For ALP, offeredAtoms can be at most 0xffffffffffff');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 100n,
                priceNanoSatsPerAtom: 10000000000n,
                minAcceptedAtoms: 101n,
                ...BASE_PARAMS_SLP,
                tokenProtocol: 'ALP',
            }),
        ).to.throw('offeredAtoms must be greater than minAcceptedAtoms');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 1n,
                priceNanoSatsPerAtom: 1n,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('Parameters cannot be represented in Script');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 0x100000000n,
                priceNanoSatsPerAtom: 1000000000n,
                minAcceptedAtoms: 1n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('minAcceptedAtoms too small, got truncated to 0');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 545n,
                priceNanoSatsPerAtom: 1000000000n,
                minAcceptedAtoms: 545n,
                ...BASE_PARAMS_SLP,
            }),
        ).to.throw('minAcceptedAtoms would cost less than dust at this price');
        expect(() =>
            AgoraPartial.approximateParams({
                offeredAtoms: 0x100000000n,
                priceNanoSatsPerAtom: 1000000000n,
                minAcceptedAtoms: 546n,
                ...BASE_PARAMS_SLP,
            }).askedSats(1n),
        ).to.throw(
            'acceptedAtoms must have the last 8 bits set to zero, use ' +
                'prepareAcceptedAtoms to get a valid amount',
        );
    });
});
