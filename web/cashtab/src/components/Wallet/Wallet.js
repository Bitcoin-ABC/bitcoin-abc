import React from 'react';
import styled from 'styled-components';
import { LinkOutlined, LoadingOutlined } from '@ant-design/icons';
import { WalletContext } from '@utils/context';
import { OnBoarding } from '@components/OnBoarding/OnBoarding';
import { QRCode } from '@components/Common/QRCode';
import { currency } from '@components/Common/Ticker.js';
import { Link } from 'react-router-dom';
import TokenList from './TokenList';
import { CashLoader } from '@components/Common/CustomIcons';
import { formatBalance } from '@utils/cashMethods';

export const LoadingCtn = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    flex-direction: column;

    svg {
        width: 50px;
        height: 50px;
        fill: #ff8d00;
    }
`;

export const BalanceHeader = styled.div`
    color: #444;
    width: 100%;
    font-size: 30px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 23px;
    }
`;

export const BalanceHeaderFiat = styled.div`
    color: #444;
    width: 100%;
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 16px;
    }
`;

export const ZeroBalanceHeader = styled.div`
    color: #444;
    width: 100%;
    font-size: 14px;
    margin-bottom: 5px;
`;

export const SwitchBtnCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: space-between;
    margin-bottom: 15px;
    .nonactiveBtn {
        color: #444;
        background: linear-gradient(145deg, #eeeeee, #c8c8c8) !important;
        box-shadow: none !important;
    }
    .slpActive {
        background: #5ebd6d !important;
        box-shadow: inset 5px 5px 11px #4e9d5a, inset -5px -5px 11px #6edd80 !important;
    }
`;

export const SwitchBtn = styled.div`
    font-weight: bold;
    display: inline-block;
    cursor: pointer;
    color: #ffffff;
    font-size: 14px;
    padding: 6px 0;
    width: 100px;
    margin: 0 1px;
    text-decoration: none;
    background: #ff8d00;
    box-shadow: inset 8px 8px 16px #d67600, inset -8px -8px 16px #ffa400;
    user-select: none;
    :first-child {
        border-radius: 100px 0 0 100px;
    }
    :nth-child(2) {
        border-radius: 0 100px 100px 0;
    }
`;

export const Links = styled(Link)`
    color: #444;
    width: 100%;
    font-size: 16px;
    margin: 10px 0 20px 0;
    border: 1px solid #444;
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: #444;
    }
    :hover {
        color: #ff8d00;
        border-color: #ff8d00;
        svg {
            fill: #444;
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

export const ExternalLink = styled.a`
    color: #444;
    width: 100%;
    font-size: 16px;
    margin: 0 0 20px 0;
    border: 1px solid #444;
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: #444;
        transition: all 200ms ease-in-out;
    }
    :hover {
        color: #ff8d00;
        border-color: #ff8d00;
        svg {
            fill: #ff8d00;
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

const WalletInfo = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, fiatPrice, balances, txHistory, apiError } = ContextValue;
    const [address, setAddress] = React.useState('cashAddress');

    const hasHistory =
        (txHistory &&
            txHistory[0] &&
            txHistory[0].transactions &&
            txHistory[0].transactions.length > 0) ||
        (txHistory &&
            txHistory[1] &&
            txHistory[1].transactions &&
            txHistory[1].transactions.length > 0);

    const handleChangeAddress = () => {
        setAddress(address === 'cashAddress' ? 'slpAddress' : 'cashAddress');
    };

    return (
        <>
            {!balances.totalBalance && !apiError && !hasHistory ? (
                <>
                    <ZeroBalanceHeader>
                        <span role="img" aria-label="party emoji">
                            🎉
                        </span>
                        Congratulations on your new wallet!{' '}
                        <span role="img" aria-label="party emoji">
                            🎉
                        </span>
                        <br /> Start using the wallet immediately to receive{' '}
                        {currency.ticker} payments, or load it up with{' '}
                        {currency.ticker} to send to others
                    </ZeroBalanceHeader>
                    <BalanceHeader>0 {currency.ticker}</BalanceHeader>
                </>
            ) : (
                <>
                    <BalanceHeader>
                        {formatBalance(balances.totalBalance)} {currency.ticker}
                    </BalanceHeader>
                    {fiatPrice !== null && !isNaN(balances.totalBalance) && (
                        <BalanceHeaderFiat>
                            ${(balances.totalBalance * fiatPrice).toFixed(2)}{' '}
                            USD
                        </BalanceHeaderFiat>
                    )}
                </>
            )}
            {apiError && (
                <>
                    <p style={{ color: 'red' }}>
                        <b>An error occured on our end.</b>
                        <br></br> Re-establishing connection...
                    </p>
                    <CashLoader />
                </>
            )}

            {wallet &&
                ((wallet.Path245 && wallet.Path145) || wallet.Path1899) && (
                    <>
                        {wallet.Path1899 ? (
                            <QRCode
                                id="borderedQRCode"
                                address={
                                    address === 'slpAddress'
                                        ? wallet.Path1899.slpAddress
                                        : wallet.Path1899.cashAddress
                                }
                            />
                        ) : (
                            <QRCode
                                id="borderedQRCode"
                                address={
                                    address === 'slpAddress'
                                        ? wallet.Path245.slpAddress
                                        : wallet.Path145.cashAddress
                                }
                            />
                        )}
                    </>
                )}

            <SwitchBtnCtn>
                <SwitchBtn
                    onClick={() => handleChangeAddress()}
                    className={
                        address !== 'cashAddress' ? 'nonactiveBtn' : null
                    }
                >
                    {currency.ticker}
                </SwitchBtn>
                <SwitchBtn
                    onClick={() => handleChangeAddress()}
                    className={
                        address === 'cashAddress' ? 'nonactiveBtn' : 'slpActive'
                    }
                >
                    {currency.tokenTicker}
                </SwitchBtn>
            </SwitchBtnCtn>
            {balances.totalBalance ? (
                <>
                    <ExternalLink
                        href={`${currency.blockExplorerUrl}/address/${wallet.Path1899.cashAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <LinkOutlined /> View Transactions
                    </ExternalLink>
                </>
            ) : null}
        </>
    );
};

const Wallet = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, tokens, loading } = ContextValue;

    return (
        <>
            {loading && (
                <LoadingCtn>
                    <LoadingOutlined />
                </LoadingCtn>
            )}
            {!loading && wallet.Path245 && <WalletInfo />}
            {!loading && wallet.Path245 && tokens && tokens.length > 0 && (
                <TokenList tokens={tokens} />
            )}
            {!loading && !wallet.Path245 ? <OnBoarding /> : null}
        </>
    );
};

export default Wallet;
