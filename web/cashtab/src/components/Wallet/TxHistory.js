import React from 'react';
import styled from 'styled-components';
import Tx from './Tx';

export const TxTitle = styled.h2`
    color: ${props => props.theme.wallet.text.secondary};
`;
export const TxLink = styled.a``;

const TxHistory = ({ txs }) => {
    return (
        <div>
            <TxTitle>Transactions</TxTitle>
            {txs.map(tx => (
                <TxLink
                    key={tx.txid}
                    href={`https://explorer.be.cash/tx/${tx.txid}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <Tx data={tx} />
                </TxLink>
            ))}
        </div>
    );
};

export default TxHistory;
