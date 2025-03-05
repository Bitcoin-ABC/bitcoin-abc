// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { AgoraPartial } from 'ecash-agora';
import { DUMMY_KEYPAIR } from 'wallet';

// Tiberium AgoraPartial
// Created by approx params offering 100, min 0.1, 10,000 XEC per CACHET
export const agoraPartialAlpTiberium: AgoraPartial = new AgoraPartial({
    dustSats: 546n,
    enforcedLockTime: 649737862,
    minAcceptedScaledTruncAtoms: 2096993n,
    numSatsTruncBytes: 1,
    numAtomsTruncBytes: 0,
    scaledTruncAtomsPerTruncSat: 162675n,
    scriptLen: 209,
    tokenId: '116e5bd33747cd23377fa220e7dc4812b6996d0cfe4776fc9c0cf8bf4cce933f',
    tokenProtocol: 'ALP',
    atomsScaleFactor: 2096993n,
    tokenType: 0,
    truncAtoms: 1024n,
    makerPk: DUMMY_KEYPAIR.pk,
});
