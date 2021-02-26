import React from 'react';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { currency } from '@components/Common/Ticker.js';
import { formatBalance } from '@utils/cashMethods';

const TokenList = ({ tokens }) => {
    return (
        <div>
            <h2 style={{ color: '#444' }}>{currency.tokenTicker} Tokens</h2>
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
