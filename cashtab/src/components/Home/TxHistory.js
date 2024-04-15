// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import Tx from 'components/Home/Tx';

const TxHistory = ({
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

TxHistory.propTypes = {
    txs: PropTypes.array,
    hashes: PropTypes.arrayOf(PropTypes.string),
    fiatPrice: PropTypes.number,
    fiatCurrency: PropTypes.string,
    cashtabState: PropTypes.shape({
        contactList: PropTypes.arrayOf(
            PropTypes.shape({
                address: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired,
            }),
        ),
        settings: PropTypes.shape({
            fiatCurrency: PropTypes.string.isRequired,
            sendModal: PropTypes.bool.isRequired,
            autoCameraOn: PropTypes.bool.isRequired,
            hideMessagesFromUnknownSenders: PropTypes.bool.isRequired,
            balanceVisible: PropTypes.bool.isRequired,
            minFeeSends: PropTypes.bool.isRequired,
        }),
        cashtabCache: PropTypes.shape({
            tokens: PropTypes.object.isRequired,
        }),
    }),
    updateCashtabState: PropTypes.func,
    userLocale: PropTypes.string,
    chaintipBlockheight: PropTypes.number,
};

export default TxHistory;
