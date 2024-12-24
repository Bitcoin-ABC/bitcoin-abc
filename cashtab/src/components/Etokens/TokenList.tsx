// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import TokenListItem, { ExtendedCashtabCachedTokenInfo } from './TokenListItem';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const TokenLink = styled(Link)`
    text-decoration: none;
`;

export type TokenInfoKv = [string, ExtendedCashtabCachedTokenInfo];

interface TokenListProps {
    tokensKvArray: TokenInfoKv[];
    userLocale: string;
}
const TokenList: React.FC<TokenListProps> = ({ tokensKvArray, userLocale }) => {
    return (
        <>
            {tokensKvArray.map(keyValueArray => (
                <TokenLink
                    key={keyValueArray[0]}
                    to={`/token/${keyValueArray[0]}`}
                >
                    <TokenListItem
                        tokenId={keyValueArray[0]}
                        tokenInfo={keyValueArray[1]}
                        userLocale={userLocale}
                    />
                </TokenLink>
            ))}
            ;
        </>
    );
};

export default TokenList;
