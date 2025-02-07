// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Tx, TokenInfo } from 'chronik-client';

// Token genesis txs
export const bearNipTokenId =
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109';
export const alitaTokenId =
    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484';
export const powTokenId =
    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a';

// SWaP tx
export const swapTxid =
    '3ce19774ed20535458bb98e864168e6d7d0a68e80f166a7fb00bc9015980ce6d';

// Map of txid => chronik.tx(txid)
const mockTxCalls: Map<string, Tx> = new Map();
mockTxCalls.set(bearNipTokenId, {
    txid: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '0e737a2f6373649341b406334341202a5ddbbdb389c55da40570b641dc23d036',
                outIdx: 1,
            },
            inputScript:
                '473044022055444db90f98b462ca29a6f51981da4015623ddc34dc1f575852426ccb785f0402206e786d4056be781ca1720a0a915b040e0a9e8716b8e4d30b0779852c191fdeb3412103771805b54969a9bea4e3eb14a82851c67592156ddb5e52d3d53677d14a40fba6',
            sats: 6231556n,
            sequenceNo: 4294967294,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010747454e45534953044245415207426561724e69701468747470733a2f2f636173687461622e636f6d2f4c0001004c0008000000000000115c',
        },
        {
            sats: 546n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            token: {
                tokenId:
                    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 4444n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '9e7f91826cfd3adf9867c1b3d102594eff4743825fad9883c35d26fb3bdc1693',
                outIdx: 1,
            },
        },
        {
            sats: 6230555n,
            outputScript: '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
            spentBy: {
                txid: '27a2471afab33d82b9404df12e1fa242488a9439a68e540dcf8f811ef39c11cf',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 299,
    isCoinbase: false,
    isFinal: true,
    tokenEntries: [
        {
            tokenId:
                '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            txType: 'GENESIS',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 782665,
        hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
        timestamp: 1678408305,
    },
});
mockTxCalls.set(alitaTokenId, {
    txid: '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '72eeff7b43dc066164d92e4c3fece47af3a40e89d46e893df1647cd29dd9f1e3',
                outIdx: 0,
            },
            inputScript:
                '473044022075166617aa473e86c72f34a5576029eb8766a035b481864ebc75759155efcce00220147e2d7e662123bd728fac700f109a245a0278959f65fc402a1e912e0a5732004121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
            sats: 1000n,
            sequenceNo: 4294967295,
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
        },
        {
            prevOut: {
                txid: '46b6f61ca026e243d55668bf304df6a21e1fcb2113943cc6bd1fdeceaae85612',
                outIdx: 2,
            },
            inputScript:
                '4830450221009e98db4b91441190bb7e4745b9f249201d0b54c81c0a816af5f3491ffb21a7e902205a4d1347a5a9133c14e4f55319af00f1df836eba6552f30b44640e9373f4cabf4121034cdb43b7a1277c4d818dc177aaea4e0bed5d464d240839d5488a278b716facd5',
            sats: 750918004n,
            sequenceNo: 4294967295,
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010747454e4553495305416c69746105416c6974610a616c6974612e636173684c0001044c00080000befe6f672000',
        },
        {
            sats: 546n,
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            token: {
                tokenId:
                    '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 210000000000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '2c336374c05f1c8f278d2a1d5f3195a17fe1bc50189ff67c9769a6afcd908ea9',
                outIdx: 1,
            },
        },
        {
            sats: 750917637n,
            outputScript: '76a914f5f740bc76e56b77bcab8b4d7f888167f416fc6888ac',
            spentBy: {
                txid: 'ca70157d5cf6275e0a36adbc3fabf671e3987f343cb35ec4ee7ed5c8d37b3233',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 436,
    isCoinbase: false,
    isFinal: true,
    tokenEntries: [
        {
            tokenId:
                '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            txType: 'GENESIS',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 756373,
        hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
        timestamp: 1662611972,
    },
});
mockTxCalls.set(powTokenId, {
    txid: 'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    version: 2,
    inputs: [
        {
            prevOut: {
                txid: '33938d6bd403e4ffef94de3e9e2ba487f095dcba3544ac8fad4a93808cea0116',
                outIdx: 1,
            },
            inputScript:
                '483045022100dad1d237b541b4a4d29197dbb01fa9755c2e17bbafb42855f38442b428f0df6b02205772d3fb00b7a053b07169e1534770c091fce42b9e1d63199f46ff89856b3fc6412102ceb4a6eca1eec20ff8e7780326932e8d8295489628c7f2ec9acf8f37f639235e',
            sats: 49998867n,
            sequenceNo: 4294967295,
            outputScript: '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a04534c500001010747454e4553495303504f571850726f6f666f6657726974696e672e636f6d20546f6b656e2168747470733a2f2f7777772e70726f6f666f6677726974696e672e636f6d2f32364c0001004c000800000000000f4240',
        },
        {
            sats: 546n,
            outputScript: '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
            token: {
                tokenId:
                    'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 1000000n,
                isMintBaton: false,
                entryIdx: 0,
            },
            spentBy: {
                txid: '69238630eb9e6a9864bf6970ff5d326800cea41a819feebecfe1a6f0ed651f5c',
                outIdx: 1,
            },
        },
        {
            sats: 49997563n,
            outputScript: '76a91485bab3680833cd9b3cc60953344fa740a2235bbd88ac',
            spentBy: {
                txid: '3c665488929f852d93a5dfb6e4b4df7bc8f7a25fb4a2480d39e3de7a30437f69',
                outIdx: 0,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 329,
    isCoinbase: false,
    isFinal: true,
    tokenEntries: [
        {
            tokenId:
                'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
            tokenType: {
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                number: 1,
            },
            txType: 'GENESIS',
            isInvalid: false,
            burnSummary: '',
            failedColorings: [],
            actualBurnAtoms: 0n,
            intentionalBurnAtoms: 0n,
            burnsMintBatons: false,
        },
    ],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NORMAL',
    block: {
        height: 685949,
        hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
        timestamp: 1620712051,
    },
});
mockTxCalls.set(swapTxid, {
    txid: '3ce19774ed20535458bb98e864168e6d7d0a68e80f166a7fb00bc9015980ce6d',
    version: 1,
    inputs: [
        {
            prevOut: {
                txid: '5e04a92c0b6e1493435d34c8f63a8c9905fb6c278662830b35757beec1bd7f12',
                outIdx: 1,
            },
            inputScript:
                '4132271505f7bc271e30983bb9f42f634fcc7b83b35efd1465e70fe3192b395099fed6ce943cb21ed742022ceffcc64502f0101e669dc68fbee2dd8d54a8e50e1e4121034474f1431c4401ba1cd22e003c614deaf108695f85b0e7ea357ee3c5c0b3b549',
            sats: 599417n,
            sequenceNo: 4294967295,
            outputScript: '76a9148f348f00f7eeb9238b028f5dd14cb9be14395cab88ac',
        },
    ],
    outputs: [
        {
            sats: 0n,
            outputScript:
                '6a045357500001020101206350c611819b7e84a2afd9611d33a98de5b3426c33561f516d49147dc1c4106b',
        },
        {
            sats: 546n,
            outputScript: '76a91483630e8c91571121a32f57c8c2b58371df7b84e188ac',
            spentBy: {
                txid: '805ff68b48739b6ec531e3b8de9369579bdac3be8f625127d1fbc145d35dd386',
                outIdx: 0,
            },
        },
        {
            sats: 598592n,
            outputScript: '76a91483630e8c91571121a32f57c8c2b58371df7b84e188ac',
            spentBy: {
                txid: '805ff68b48739b6ec531e3b8de9369579bdac3be8f625127d1fbc145d35dd386',
                outIdx: 1,
            },
        },
    ],
    lockTime: 0,
    timeFirstSeen: 0,
    size: 271,
    isCoinbase: false,
    isFinal: true,
    tokenEntries: [],
    tokenFailedParsings: [],
    tokenStatus: 'TOKEN_STATUS_NON_TOKEN',
    block: {
        height: 798428,
        hash: '0000000000000000025cd2836f07355eb8d5db6ea16b85db7746da90b1f57b61',
        timestamp: 1687998840,
    },
});

// Map of txid => chronik.tx(txid)
const mockTokenCalls: Map<string, TokenInfo> = new Map();
mockTokenCalls.set(bearNipTokenId, {
    tokenId: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: 'BEAR',
        tokenName: 'BearNip',
        url: 'https://cashtab.com/',
        decimals: 0,
        hash: '',
    },
    block: {
        height: 782665,
        hash: '00000000000000001239831f90580c859ec174316e91961cf0e8cde57c0d3acb',
        timestamp: 1678408305,
    },
});
mockTokenCalls.set(alitaTokenId, {
    tokenId: '54dc2ecd5251f8dfda4c4f15ce05272116b01326076240e2b9cc0104d33b1484',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: 'Alita',
        tokenName: 'Alita',
        url: 'alita.cash',
        decimals: 4,
        hash: '',
    },
    block: {
        height: 756373,
        hash: '00000000000000000d62f1b66c08f0976bcdec2f08face2892ae4474b50100d9',
        timestamp: 1662611972,
    },
});
mockTokenCalls.set(powTokenId, {
    tokenId: 'f36e1b3d9a2aaf74f132fef3834e9743b945a667a4204e761b85f2e7b65fd41a',
    tokenType: {
        protocol: 'SLP',
        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
        number: 1,
    },
    timeFirstSeen: 0,
    genesisInfo: {
        tokenTicker: 'POW',
        tokenName: 'ProofofWriting.com Token',
        url: 'https://www.proofofwriting.com/26',
        decimals: 0,
        hash: '',
    },
    block: {
        height: 685949,
        hash: '0000000000000000436e71d5291d2fb067decc838dcb85a99ff6da1d28b89fad',
        timestamp: 1620712051,
    },
});

export { mockTxCalls, mockTokenCalls };
