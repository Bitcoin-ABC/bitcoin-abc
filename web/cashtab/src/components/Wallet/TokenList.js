import React from 'react';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { currency } from '@components/Common/Ticker.js';

const TokenList = ({ tokens }) => {
    return (
        <div>
            <h2 style={{ color: '#444' }}>{currency.tokenTicker} Tokens</h2>
            {tokens.map(token => (
                <Link key={token.tokenId} to={`/send-token/${token.tokenId}`}>
                    <TokenListItem
                        ticker={token.info.tokenTicker}
                        tokenId={token.tokenId}
                        balance={token.balance.toString()}
                    />
                </Link>
            ))}
        </div>
    );
};

export default TokenList;
