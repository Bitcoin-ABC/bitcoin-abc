import React from 'react';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { formatBalance } from '@utils/cashMethods';

const TokenList = ({ tokens }) => {
    return (
        <div>
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
