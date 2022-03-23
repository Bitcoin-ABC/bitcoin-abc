import * as React from 'react';
import PropTypes from 'prop-types';
import { formatBalance } from '@utils/formatting';
import { BalanceHeaderWrap } from '@components/Common/Atoms';

const BalanceHeader = ({ balance, ticker }) => {
    return (
        <BalanceHeaderWrap>
            {formatBalance(balance)} {ticker}
        </BalanceHeaderWrap>
    );
};

// balance may be a number (XEC balance) or a BigNumber object (token balance)
BalanceHeader.propTypes = {
    balance: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    ticker: PropTypes.string,
};

export default BalanceHeader;
