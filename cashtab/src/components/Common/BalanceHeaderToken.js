import * as React from 'react';
import PropTypes from 'prop-types';
import { formatTokenBalance } from 'utils/formatting';
import styled from 'styled-components';

const TokenBalance = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    font-size: 28px;
    font-weight: bold;
    padding: 12px;
    line-height: 1.4em;
    @media (max-width: 768px) {
        font-size: 24px;
    }
`;

const BalanceHeaderToken = ({ balance, ticker, tokenDecimals }) => {
    return (
        <TokenBalance>
            {formatTokenBalance(balance, tokenDecimals)} {ticker}
        </TokenBalance>
    );
};

// balance may be a string (XEC balance) or a BigNumber object (token balance)
BalanceHeaderToken.propTypes = {
    balance: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    ticker: PropTypes.string,
    tokenDecimals: PropTypes.number,
};

export default BalanceHeaderToken;
