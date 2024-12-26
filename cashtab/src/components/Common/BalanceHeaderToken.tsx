// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled from 'styled-components';

const TokenBalance = styled.div`
    color: ${props => props.theme.primaryText};
    width: 100%;
    font-size: 28px;
    font-weight: bold;
    padding: 12px;
    line-height: 1.4em;
    @media (max-width: 768px) {
        font-size: 24px;
    }
`;

interface BalanceHeaderTokenProps {
    formattedDecimalizedTokenBalance: string | null;
    name: string | undefined;
    ticker: string | undefined;
}
const BalanceHeaderToken: React.FC<BalanceHeaderTokenProps> = ({
    formattedDecimalizedTokenBalance,
    name,
    ticker,
}) => {
    const renderedNameAndTicker =
        typeof name !== 'undefined' && typeof ticker !== 'undefined'
            ? `${name}${ticker !== '' ? ` (${ticker})` : ''}`
            : '';
    return (
        <TokenBalance>
            {typeof formattedDecimalizedTokenBalance === 'string'
                ? formattedDecimalizedTokenBalance
                : ''}{' '}
            {renderedNameAndTicker}
        </TokenBalance>
    );
};

export default BalanceHeaderToken;
