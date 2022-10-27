import * as React from 'react';
import PropTypes from 'prop-types';
import { formatTokenBalance } from 'utils/formatting';
import { BalanceHeaderWrap } from 'components/Common/Atoms';

const BalanceHeaderToken = ({ balance, ticker, tokenDecimals }) => {
    return (
        <BalanceHeaderWrap>
            {formatTokenBalance(balance, tokenDecimals)} {ticker}
        </BalanceHeaderWrap>
    );
};

// balance may be a string (XEC balance) or a BigNumber object (token balance)
BalanceHeaderToken.propTypes = {
    balance: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    ticker: PropTypes.string,
    tokenDecimals: PropTypes.number,
};

export default BalanceHeaderToken;
