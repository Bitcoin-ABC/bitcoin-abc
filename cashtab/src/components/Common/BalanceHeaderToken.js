// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import PropTypes from 'prop-types';
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

const BalanceHeaderToken = ({
    formattedDecimalizedTokenBalance,
    name,
    ticker,
}) => {
    return (
        <TokenBalance>
            {typeof formattedDecimalizedTokenBalance === 'string'
                ? formattedDecimalizedTokenBalance
                : ''}{' '}
            {name} ({ticker})
        </TokenBalance>
    );
};

// balance may be a string (XEC balance) or a BigNumber object (token balance)
BalanceHeaderToken.propTypes = {
    formattedDecimalizedTokenBalance: PropTypes.string,
    name: PropTypes.string,
    ticker: PropTypes.string,
};

export default BalanceHeaderToken;
