import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { formatBalance } from 'utils/formatting';
import { BalanceHeaderWrap } from 'components/Common/Atoms';

const HiddenBalanceCtn = styled.span`
    font-size: 28px;
    width: 100%;
    margin-bottom: 0px;
    color: transparent;
    text-shadow: 0 0 15px #fff;
    font-weight: bold;
    line-height: 1.4em;
    @media (max-width: 768px) {
        font-size: 24px;
    }
`;
const BalanceHeader = ({ balance, ticker, cashtabSettings }) => {
    return (
        <BalanceHeaderWrap>
            {cashtabSettings && cashtabSettings.balanceVisible ? (
                <span data-testid="balance-header-rendered">
                    {formatBalance(balance)} {ticker}{' '}
                </span>
            ) : (
                <HiddenBalanceCtn>
                    {' '}
                    {formatBalance(balance)} {ticker}{' '}
                </HiddenBalanceCtn>
            )}
        </BalanceHeaderWrap>
    );
};

// balance may be a string (XEC balance) or a BigNumber object (token balance)
BalanceHeader.propTypes = {
    balance: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    ticker: PropTypes.string,
    cashtabSettings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
};

export default BalanceHeader;
