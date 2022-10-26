import React from 'react';
import PropTypes from 'prop-types';
import Tx from './Tx';
import { flattenContactList } from 'utils/cashMethods';

const TxHistory = ({
    txs,
    fiatPrice,
    fiatCurrency,
    contactList,
    cashtabSettings,
    cashtabCache,
}) => {
    // Convert contactList array of objects to an array of addresses
    const addressesInContactList = flattenContactList(contactList);
    return (
        <div>
            {txs.map(tx => (
                <Tx
                    key={tx.txid}
                    data={tx}
                    fiatPrice={fiatPrice}
                    fiatCurrency={fiatCurrency}
                    addressesInContactList={addressesInContactList}
                    contactList={contactList}
                    cashtabSettings={cashtabSettings}
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
    cashtabSettings: PropTypes.oneOfType([
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
