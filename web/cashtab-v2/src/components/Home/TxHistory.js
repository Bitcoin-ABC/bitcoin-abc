import React from 'react';
import PropTypes from 'prop-types';
import Tx from './Tx';

const TxHistory = ({ txs, fiatPrice, fiatCurrency }) => {
    return (
        <div>
            {txs.map(tx => (
                <Tx
                    key={tx.txid}
                    data={tx}
                    fiatPrice={fiatPrice}
                    fiatCurrency={fiatCurrency}
                />
            ))}
        </div>
    );
};

TxHistory.propTypes = {
    txs: PropTypes.array,
    fiatPrice: PropTypes.number,
    fiatCurrency: PropTypes.string,
};

export default TxHistory;
