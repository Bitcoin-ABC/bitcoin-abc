// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import Tx from 'components/Home/Tx';
import TxHistoryPagination from 'components/Home/TxHistoryPagination';
import {
    CashtabPathInfo,
    CashtabTx,
    CashtabWallet,
    LegacyCashtabWallet,
} from 'wallet';
import CashtabState, { CashtabContact } from 'config/CashtabState';
import CashtabCache from 'config/CashtabCache';
import CashtabSettings from 'config/CashtabSettings';
import { CashtabCacheJson, StoredCashtabWallet } from 'helpers';
import { getTransactionHistory } from 'chronik';
import { ChronikClient } from 'chronik-client';
import appConfig from 'config/app';

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
    chronik: ChronikClient;
}

const TxHistory: React.FC<TxHistoryProps> = ({
    txs,
    hashes,
    fiatPrice,
    fiatCurrency,
    cashtabState,
    updateCashtabState,
    userLocale = 'en-US',
    chronik,
}) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [paginatedTxs, setPaginatedTxs] = useState<CashtabTx[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showPagination, setShowPagination] = useState(false);

    // Get the path1899 address (path 1899 is always defined in CashtabWalletPaths)
    const path1899Address = (
        cashtabState.wallets[0].paths.get(
            appConfig.derivationPath,
        ) as CashtabPathInfo
    ).address!;

    // Reset pagination when wallet changes
    useEffect(() => {
        setCurrentPage(0);
        setPaginatedTxs([]);
    }, [path1899Address]);

    // Check if we need to show pagination (more than 20 transactions)
    useEffect(() => {
        const checkTotalPages = async () => {
            if (!path1899Address) return;

            try {
                const result = await getTransactionHistory(
                    chronik,
                    path1899Address,
                    cashtabState.cashtabCache.tokens,
                );
                setTotalPages(result.totalPages!);
                setShowPagination(result.totalPages! > 1);
            } catch (error) {
                console.error('Error checking total pages:', error);
            }
        };

        checkTotalPages();
    }, [
        chronik,
        path1899Address,
        cashtabState.cashtabCache.tokens,
        cashtabState.wallets,
    ]);

    // Load paginated transactions when page changes
    const handlePageChange = async (page: number) => {
        if (!path1899Address || loading) return;

        setLoading(true);
        try {
            const result = await getTransactionHistory(
                chronik,
                path1899Address,
                cashtabState.cashtabCache.tokens,
                page,
            );
            setPaginatedTxs(result.txs);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error loading paginated transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Show paginated transactions if we're on a page > 0, otherwise show regular txs
    const displayTxs = currentPage === 0 ? txs : paginatedTxs;

    return (
        <>
            {displayTxs.map(tx => (
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
            {showPagination && (
                <TxHistoryPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    loading={loading}
                    onPageChange={handlePageChange}
                />
            )}
        </>
    );
};

export default TxHistory;
