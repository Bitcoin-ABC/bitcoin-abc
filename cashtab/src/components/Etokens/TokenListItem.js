// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import TokenIcon from './TokenIcon';

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
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    color: ${props => props.theme.contrast};
    padding: 10px 0;
    justify-content: space-between;
    h4 {
        font-size: 16px;
        color: ${props => props.theme.contrast};
        margin: 0;
        font-weight: bold;
    }
    :hover {
        h4 {
            color: ${props => props.theme.eCashPurple};
        }
    }
`;

/**
 * Display token ticker and balance as a table item
 * All tokens should be cached when this screen is rendered
 * But, in case it isn't for any reason, handle this case
 */
const TokenListItem = ({ tokenId, balance, cachedTokenInfo }) => {
    return (
        <Wrapper>
            <TokenNameCtn>
                <TokenIconWrapper>
                    <TokenIcon size={32} tokenId={tokenId} />
                </TokenIconWrapper>
                <h4>
                    {typeof cachedTokenInfo !== 'undefined'
                        ? cachedTokenInfo.genesisInfo.tokenTicker
                        : 'UNCACHED'}
                </h4>
            </TokenNameCtn>

            <h4>{balance}</h4>
        </Wrapper>
    );
};

TokenListItem.propTypes = {
    ticker: PropTypes.string,
    balance: PropTypes.string,
    tokenId: PropTypes.string,
    cachedTokenInfo: PropTypes.oneOfType([
        undefined,
        PropTypes.shape({
            block: PropTypes.shape({
                hash: PropTypes.string,
                height: PropTypes.number,
                timestamp: PropTypes.number,
            }),
            genesisInfo: PropTypes.shape({
                decimals: PropTypes.number,
                hash: PropTypes.string,
                tokenName: PropTypes.string,
                tokenTicker: PropTypes.string,
                url: PropTypes.string,
            }),
            genesisMintBatons: PropTypes.number,
            genesisOutputScripts: PropTypes.arrayOf(PropTypes.string),
            timeFirstSeen: PropTypes.number,
            tokenType: PropTypes.shape({
                number: PropTypes.number,
                protocol: PropTypes.string,
                type: PropTypes.string,
            }),
        }),
    ]),
};

export default TokenListItem;
