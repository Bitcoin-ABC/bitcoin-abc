// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import TokenListItem from './TokenListItem';
import { Link } from 'react-router-dom';
import { decimalizedTokenQtyToLocaleFormat } from 'utils/formatting';
import styled from 'styled-components';

const TokenLink = styled(Link)`
    text-decoration: none;
`;

const TokenList = ({ tokens, tokenCache, userLocale }) => {
    return Array.from(tokens).map(keyValueArray => (
        <TokenLink
            key={keyValueArray[0]}
            to={`/send-token/${keyValueArray[0]}`}
        >
            <TokenListItem
                tokenId={keyValueArray[0]}
                balance={decimalizedTokenQtyToLocaleFormat(
                    keyValueArray[1],
                    userLocale,
                )}
                cachedTokenInfo={tokenCache.get(keyValueArray[0])}
            />
        </TokenLink>
    ));
};

TokenList.propTypes = {
    tokens: PropTypes.instanceOf(Map),
    tokenCache: PropTypes.instanceOf(Map),
    userLocale: PropTypes.string,
};

export default TokenList;
