// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { toHex } from 'ecash-lib';
import Tx from 'components/Home/Tx';
import TxHistoryPagination from 'components/Home/TxHistoryPagination';
import { CashtabTx } from 'wallet';
import { getTransactionHistory } from 'chronik';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { getUserLocale } from 'helpers';

const TxHistory: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the component
        return null;
    }
    const {
        chronik,
        fiatPrice,
        cashtabState,
        updateCashtabState,
        transactionHistory,
    } = ContextValue;
    const { settings } = cashtabState;
    const { ecashWallet } = ContextValue;

    if (!ecashWallet) {
        return null;
    }

    const hashes = [toHex(ecashWallet.pkh)];
    const fiatCurrency =
        settings && settings.fiatCurrency ? settings.fiatCurrency : 'usd';
    const userLocale = getUserLocale(navigator);
    const [currentPage, setCurrentPage] = useState(0);
    const [paginatedTxs, setPaginatedTxs] = useState<CashtabTx[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showPagination, setShowPagination] = useState(false);

    // Get the path1899 address (path 1899 is always defined in CashtabWalletPaths)
    const path1899Address = ecashWallet.address;

    // Get first page transactions from context
    const txs = transactionHistory?.firstPageTxs || [];

    // Reset pagination when wallet changes
    useEffect(() => {
        setCurrentPage(0);
        setPaginatedTxs([]);
    }, [path1899Address]);

    // Check if we need to show pagination (more than 20 transactions)
    useEffect(() => {
        if (transactionHistory) {
            setTotalPages(transactionHistory.numPages);
            setShowPagination(transactionHistory.numPages > 1);
        }
    }, [transactionHistory]);

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
                    updateCashtabState={updateCashtabState as any}
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
