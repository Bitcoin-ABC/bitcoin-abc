import React from 'react';
import styled from 'styled-components';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { currency } from '@components/Common/Ticker.js';
import { formatBalance } from '@utils/cashMethods';

export const TokenTitle = styled.h2`
    color: ${props => props.theme.wallet.text.secondary};
`;

const TokenList = ({ tokens }) => {
    return (
        <div>
            <TokenTitle>{currency.tokenTicker} Tokens</TokenTitle>
            {tokens.map(token => (
                <Link key={token.tokenId} to={`/send-token/${token.tokenId}`}>
                    <TokenListItem
                        ticker={token.info.tokenTicker}
                        tokenId={token.tokenId}
                        balance={formatBalance(token.balance)}
                    />
                </Link>
            ))}
        </div>
    );
};

export default TokenList;
