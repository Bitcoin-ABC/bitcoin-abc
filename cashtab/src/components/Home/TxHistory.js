// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import Tx from './Tx';

const TxHistory = ({ txs, fiatPrice, fiatCurrency, cashtabState }) => {
    return (
        <div>
            {txs.map(tx => (
                <Tx
                    key={tx.txid}
                    data={tx}
                    fiatPrice={fiatPrice}
                    fiatCurrency={fiatCurrency}
                    cashtabState={cashtabState}
                />
            ))}
        </div>
    );
};

TxHistory.propTypes = {
    txs: PropTypes.array,
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
};

export default TxHistory;
