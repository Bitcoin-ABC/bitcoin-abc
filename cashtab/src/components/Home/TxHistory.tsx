// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import Tx from 'components/Home/Tx';
import { CashtabTx, CashtabWallet, LegacyCashtabWallet } from 'wallet';
import CashtabState, { CashtabContact } from 'config/CashtabState';
import CashtabCache from 'config/CashtabCache';
import CashtabSettings from 'config/CashtabSettings';
import { CashtabCacheJson, StoredCashtabWallet } from 'helpers';

interface TxHistoryProps {
    txs: CashtabTx[];
    hashes: string[];
    fiatPrice: number | null;
    fiatCurrency: string;
    cashtabState: CashtabState;
    updateCashtabState: (
        key: string,
        value:
            | CashtabWallet[]
            | CashtabCache
            | CashtabContact[]
            | CashtabSettings
            | CashtabCacheJson
            | StoredCashtabWallet[]
            | (LegacyCashtabWallet | StoredCashtabWallet)[],
    ) => Promise<boolean>;
    userLocale: string;
}

const TxHistory: React.FC<TxHistoryProps> = ({
    txs,
    hashes,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    userLocale = 'en-US',
}) => {
    return (
        <>
            {txs.map(tx => (
                <Tx
                    key={tx.txid}
                    hashes={hashes}
                    tx={tx}
                    fiatPrice={fiatPrice}
                    fiatCurrency={fiatCurrency}
                    cashtabState={cashtabState}
                    updateCashtabState={updateCashtabState}
                    userLocale={userLocale}
                />
            ))}
        </>
    );
};

export default TxHistory;
