import React from 'react';
import PropTypes from 'prop-types';
import Tx from './Tx';
import { flattenContactList } from 'utils/cashMethods';

const TxHistory = ({ txs, fiatPrice, fiatCurrency, contactList }) => {
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
                />
            ))}
        </div>
    );
};

TxHistory.propTypes = {
    txs: PropTypes.array,
    fiatPrice: PropTypes.number,
    fiatCurrency: PropTypes.string,
    contactList: PropTypes.arrayOf(
        PropTypes.shape({
            address: PropTypes.string,
            name: PropTypes.string,
        }),
    ),
};

export default TxHistory;
