import React from 'react';
import PropTypes from 'prop-types';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { formatBalance } from '@utils/formatting';

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

TokenList.propTypes = {
    tokens: PropTypes.array,
};

export default TokenList;
