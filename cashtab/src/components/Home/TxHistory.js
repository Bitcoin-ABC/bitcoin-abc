import React from 'react';
import PropTypes from 'prop-types';
import Tx from './Tx';

const TxHistory = ({
    txs,
    fiatPrice,
    fiatCurrency,
    contactList,
    settings,
    cashtabCache,
}) => {
    return (
        <div>
            {txs.map(tx => (
                <Tx
                    key={tx.txid}
                    data={tx}
                    fiatPrice={fiatPrice}
                    fiatCurrency={fiatCurrency}
                    contactList={contactList}
                    settings={settings}
                    cashtabCache={cashtabCache}
                />
            ))}
        </div>
    );
};

TxHistory.propTypes = {
    txs: PropTypes.array,
    fiatPrice: PropTypes.number,
    cashtabCache: PropTypes.object,
    fiatCurrency: PropTypes.string,
    contactList: PropTypes.arrayOf(
        PropTypes.shape({
            address: PropTypes.string,
            name: PropTypes.string,
        }),
    ),
    settings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
};

export default TxHistory;
