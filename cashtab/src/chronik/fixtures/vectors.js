// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    mockParseTxWallet,
    mockAliasWallet,
    mockParseTxWalletAirdrop,
    mockParseTxWalletEncryptedMsg,
    txHistoryTokenInfoById,
    stakingRwd,
    incomingXec,
    outgoingXec,
    aliasRegistration,
    incomingEtoken,
    outgoingEtoken,
    genesisTx,
    incomingEtokenNineDecimals,
    legacyAirdropTx,
    outgoingEncryptedMsg,
    incomingEncryptedMsg,
    tokenBurn,
    tokenBurnDecimals,
    incomingEtokenTwo,
    swapTx,
    mockSwapWallet,
    aliasOffSpec,
    PayButtonNoDataYesNonce,
    PayButtonYesDataYesNonce,
    PayButtonBadVersion,
    PayButtonOffSpec,
    PayButtonEmpty,
    PayButtonYesDataNoNonce,
    MsgFromElectrum,
    mockFlatTxHistoryNoUnconfirmed,
    mockSortedTxHistoryNoUnconfirmed,
    mockFlatTxHistoryWithUnconfirmed,
    mockSortedFlatTxHistoryWithUnconfirmed,
    mockFlatTxHistoryWithAllUnconfirmed,
    mockSortedFlatTxHistoryWithAllUnconfirmed,
    AlpTx,
} from './mocks';
import { mockChronikUtxos, mockOrganizedUtxosByType } from './chronikUtxos';

export default {
    parseChronikTx: {
        expectedReturns: [
            {
                description: 'Staking rewards coinbase tx',
                tx: stakingRwd.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: stakingRwd.parsed,
            },
            {
                description: 'Incoming XEC tx',
                tx: incomingXec.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: incomingXec.parsed,
            },
            {
                description: 'Outgoing XEC tx',
                tx: outgoingXec.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: outgoingXec.parsed,
            },
            {
                description: 'Alias registration',
                tx: aliasRegistration.tx,
                wallet: mockAliasWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: aliasRegistration.parsed,
            },
            {
                description: 'Incoming eToken',
                tx: incomingEtoken.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: incomingEtoken.parsed,
            },
            {
                description: 'Outgoing eToken',
                tx: outgoingEtoken.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: outgoingEtoken.parsed,
            },
            {
                description: 'Genesis tx',
                tx: genesisTx.tx,
                wallet: mockParseTxWalletAirdrop,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: genesisTx.parsed,
            },
            {
                description: 'Incoming eToken tx with 9 decimals',
                tx: incomingEtokenNineDecimals.tx,
                wallet: mockParseTxWalletAirdrop,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: incomingEtokenNineDecimals.parsed,
            },
            {
                description: 'Legacy airdrop tx',
                tx: legacyAirdropTx.tx,
                wallet: mockParseTxWalletAirdrop,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: legacyAirdropTx.parsed,
            },
            {
                description: 'Outgoing encrypted msg (deprecated)',
                tx: outgoingEncryptedMsg.tx,
                wallet: mockParseTxWalletEncryptedMsg,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: outgoingEncryptedMsg.parsed,
            },
            {
                description: 'Incoming encrypted msg (deprecated)',
                tx: incomingEncryptedMsg.tx,
                wallet: mockParseTxWalletEncryptedMsg,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: incomingEncryptedMsg.parsed,
            },
            {
                description: 'Token burn tx',
                tx: tokenBurn.tx,
                wallet: mockParseTxWalletAirdrop,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: tokenBurn.parsed,
            },
            {
                description: 'Token burn tx with decimals',
                tx: tokenBurnDecimals.tx,
                wallet: mockParseTxWalletAirdrop,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: tokenBurnDecimals.parsed,
            },
            {
                description: 'Incoming eToken tx less than zero with decimals',
                tx: incomingEtokenTwo.tx,
                wallet: mockParseTxWalletAirdrop,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: incomingEtokenTwo.parsed,
            },
            {
                description: 'SWaP tx',
                tx: swapTx.tx,
                wallet: mockSwapWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: swapTx.parsed,
            },
            {
                description: 'Pre-spec alias registration (now off spec)',
                tx: aliasOffSpec.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: aliasOffSpec.parsed,
            },
            {
                description: 'PayButton tx with no data and payment id',
                tx: PayButtonNoDataYesNonce.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: PayButtonNoDataYesNonce.parsed,
            },
            {
                description: 'PayButton tx with data and payment id',
                tx: PayButtonYesDataYesNonce.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: PayButtonYesDataYesNonce.parsed,
            },
            {
                description: 'PayButton tx with no data and no payment id',
                tx: PayButtonEmpty.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: PayButtonEmpty.parsed,
            },
            {
                description: 'PayButton tx with data and no payment id',
                tx: PayButtonYesDataNoNonce.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: PayButtonYesDataNoNonce.parsed,
            },
            {
                description: 'PayButton tx with unsupported version number',
                tx: PayButtonBadVersion.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: PayButtonBadVersion.parsed,
            },
            {
                description:
                    'Paybutton tx that does not have spec number of pushes',
                tx: PayButtonOffSpec.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: PayButtonOffSpec.parsed,
            },
            {
                description: 'External msg received from Electrum',
                tx: MsgFromElectrum.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: MsgFromElectrum.parsed,
            },
            {
                description:
                    'Before adding support for tokens other than SLPV1, an ALP tx is parsed as an eCash tx',
                tx: AlpTx.tx,
                wallet: mockParseTxWallet,
                tokenInfoById: txHistoryTokenInfoById,
                parsed: AlpTx.parsed,
            },
        ],
        expectedErrors: [],
    },
    sortAndTrimChronikTxHistory: {
        expectedReturns: [
            {
                description:
                    'successfully orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if all txs are confirmed',
                flatTxHistoryArray: mockFlatTxHistoryNoUnconfirmed,
                txHistoryCount: 10,
                returned: mockSortedTxHistoryNoUnconfirmed,
            },
            {
                description:
                    'orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if some txs are confirmed and others unconfirmed',
                flatTxHistoryArray: mockFlatTxHistoryWithUnconfirmed,
                txHistoryCount: 10,
                returned: mockSortedFlatTxHistoryWithUnconfirmed,
            },
            {
                description:
                    'orders the result of flattenChronikTxHistory by blockheight and firstSeenTime if all txs are unconfirmed,',
                flatTxHistoryArray: mockFlatTxHistoryWithAllUnconfirmed,
                txHistoryCount: 10,
                returned: mockSortedFlatTxHistoryWithAllUnconfirmed,
            },
        ],
    },
    organizeUtxosByType: {
        expectedReturns: [
            {
                description:
                    'Splits token utxos and non-token utxos using real in-node utxos',
                chronikUtxos: mockChronikUtxos,
                returned: mockOrganizedUtxosByType,
            },
            {
                description: 'Splits token utxos and non-token utxos',
                chronikUtxos: [{ token: 'true' }, { amount: 500 }],
                returned: {
                    slpUtxos: [{ token: 'true' }],
                    nonSlpUtxos: [{ amount: 500 }],
                },
            },
            {
                description:
                    'Returns empty array for nonSlpUtxos if all utxos are token utxos',
                chronikUtxos: [{ token: 'true' }, { token: 'true' }],
                returned: {
                    slpUtxos: [{ token: 'true' }, { token: 'true' }],
                    nonSlpUtxos: [],
                },
            },
            {
                description:
                    'Returns empty array for preliminarySlpUtxos if no token utxos found',
                chronikUtxos: [{ amount: 500 }, { amount: 500 }],
                returned: {
                    slpUtxos: [],
                    nonSlpUtxos: [{ amount: 500 }, { amount: 500 }],
                },
            },
        ],
    },
};
