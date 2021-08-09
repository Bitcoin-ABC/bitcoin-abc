import * as React from 'react';
import { formatBalance } from '@utils/cashMethods';
import { BalanceHeaderWrap } from '@components/Common/Atoms';

export const BalanceHeader = ({ balance, ticker }) => {
    return (
        <BalanceHeaderWrap>
            {formatBalance(balance)} {ticker}
        </BalanceHeaderWrap>
    );
};
