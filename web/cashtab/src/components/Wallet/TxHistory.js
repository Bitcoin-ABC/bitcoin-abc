import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Tx from './Tx';

export const TxLink = styled.a``;

const TxHistory = ({ txs, fiatPrice, fiatCurrency }) => {
    return (
        <div>
            {txs.map(tx => (
                <TxLink
                    key={tx.txid}
                    href={`https://explorer.be.cash/tx/${tx.txid}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <Tx
                        data={tx}
                        fiatPrice={fiatPrice}
                        fiatCurrency={fiatCurrency}
                    />
                </TxLink>
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
