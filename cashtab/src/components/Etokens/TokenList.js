// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { formatTokenBalance } from 'utils/formatting';
import { BN } from 'slp-mdm';

const TokenList = ({ tokens }) => {
    return (
        <div>
            {tokens.map(token => (
                <Link key={token.tokenId} to={`/send-token/${token.tokenId}`}>
                    <TokenListItem
                        ticker={token.info.tokenTicker}
                        tokenId={token.tokenId}
                        balance={formatTokenBalance(
                            new BN(token.balance),
                            token.info.decimals,
                        )}
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
