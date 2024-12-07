// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import Tx from 'components/Home/Tx';
import { CashtabTx } from 'wallet';
import CashtabState from 'config/CashtabState';

interface TxHistoryProps {
    txs: CashtabTx[];
    hashes: string[];
    fiatPrice: number | null;
    fiatCurrency: string;
    cashtabState: CashtabState;
    updateCashtabState: () => void;
    chaintipBlockheight: number;
    userLocale: string;
}

const TxHistory: React.FC<TxHistoryProps> = ({
    txs,
    hashes,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    chaintipBlockheight,
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
                    chaintipBlockheight={chaintipBlockheight}
                    userLocale={userLocale}
                />
            ))}
        </>
    );
};

export default TxHistory;
