// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import TokenIcon from './TokenIcon';
import { decimalizedTokenQtyToLocaleFormat } from 'formatting';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';

const TokenIconWrapper = styled.div`
    margin-right: 10px;
`;

const TokenNameCtn = styled.div`
    display: flex;
    align-items: center;
`;

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    color: ${props => props.theme.primaryText};
    padding: 10px 0;
    justify-content: space-between;
    h4 {
        font-size: var(--text-base);
        line-height: var(--text-base--line-height);
        color: ${props => props.theme.primaryText};
        margin: 0;
        font-weight: bold;
    }
    :hover {
        h4 {
            color: ${props => props.theme.secondaryAccent};
        }
    }
`;

/**
 * We add balance key to token info for tokens we have
 * This is to keep data together for each token that we use for sorting on this page
 */
export interface ExtendedCashtabCachedTokenInfo extends CashtabCachedTokenInfo {
    balance: string;
}

interface TokenListItemProps {
    tokenId: string;
    tokenInfo: ExtendedCashtabCachedTokenInfo;
    userLocale: string;
}

/**
 * Display token ticker and balance as a table item
 * All tokens should be cached when this screen is rendered
 * But, in case it isn't for any reason, handle this case
 */
const TokenListItem: React.FC<TokenListItemProps> = ({
    tokenId,
    tokenInfo,
    userLocale,
}) => {
    return (
        <Wrapper title="Token List Item">
            <TokenNameCtn>
                <TokenIconWrapper>
                    <TokenIcon size={32} tokenId={tokenId} />
                </TokenIconWrapper>
                <h4>
                    {typeof tokenInfo !== 'undefined'
                        ? tokenInfo.genesisInfo.tokenTicker
                        : 'UNCACHED'}
                </h4>
            </TokenNameCtn>

            <h4>
                {decimalizedTokenQtyToLocaleFormat(
                    tokenInfo.balance,
                    userLocale,
                )}
            </h4>
        </Wrapper>
    );
};

export default TokenListItem;
