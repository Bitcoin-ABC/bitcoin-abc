import React from 'react';
import styled from 'styled-components';
import { LinkOutlined, LoadingOutlined } from '@ant-design/icons';
import { WalletContext } from '@utils/context';
import { OnBoarding } from '@components/OnBoarding/OnBoarding';
import { QRCode } from '@components/Common/QRCode';
import { currency } from '@components/Common/Ticker.js';
import { Link } from 'react-router-dom';
import TokenList from './TokenList';
import TxHistory from './TxHistory';
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
        fill: ${props => props.theme.primary};
    }
`;

export const BalanceHeader = styled.div`
    color: ${props => props.theme.wallet.text.primary};
    width: 100%;
    font-size: 30px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 23px;
    }
`;

export const BalanceHeaderFiat = styled.div`
    color: ${props => props.theme.wallet.text.secondary};
    width: 100%;
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 16px;
    }
`;

export const ZeroBalanceHeader = styled.div`
    color: ${props => props.theme.wallet.text.primary};
    width: 100%;
    font-size: 14px;
    margin-bottom: 5px;
`;

export const Tabs = styled.div`
    margin: auto;
    margin-bottom: 12px;
    display: inline-block;
    text-align: center;
`;
export const TabLabel = styled.button`
    :focus,
    :active {
        outline: none;
    }

    border: none;
    background: none;
    font-size: 20px;
    cursor: pointer;

    @media (max-width: 400px) {
        font-size: 16px;
    }

    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.primary};       
  `}
`;
export const TabLine = styled.div`
    margin: auto;
    transition: margin-left 0.5s ease-in-out, width 0.5s 0.1s;
    height: 4px;
    border-radius: 5px;
    background-color: ${props => props.theme.primary};
    pointer-events: none;

    margin-left: 72%;
    width: 28%;

    ${({ left, ...props }) =>
        left &&
        `
        margin-left: 1%
        width: 69%;
  `}
`;
export const TabPane = styled.div`
    ${({ active }) =>
        !active &&
        `    
        display: none;
  `}
`;

export const SwitchBtnCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: space-between;
    margin-bottom: 15px;
    .nonactiveBtn {
        color: ${props => props.theme.wallet.text.secondary};
        background: ${props =>
            props.theme.wallet.switch.inactive.background} !important;
        box-shadow: none !important;
    }
    .slpActive {
        background: ${props =>
            props.theme.wallet.switch.activeToken.background} !important;
        box-shadow: ${props =>
            props.theme.wallet.switch.activeToken.shadow} !important;
    }
`;

export const SwitchBtn = styled.div`
    font-weight: bold;
    display: inline-block;
    cursor: pointer;
    color: ${props => props.theme.contrast};
    font-size: 14px;
    padding: 6px 0;
    width: 100px;
    margin: 0 1px;
    text-decoration: none;
    background: ${props => props.theme.primary};
    box-shadow: ${props => props.theme.wallet.switch.activeCash.shadow};
    user-select: none;
    :first-child {
        border-radius: 100px 0 0 100px;
    }
    :nth-child(2) {
        border-radius: 0 100px 100px 0;
    }
`;

export const Links = styled(Link)`
    color: ${props => props.theme.wallet.text.secondary};
    width: 100%;
    font-size: 16px;
    margin: 10px 0 20px 0;
    border: 1px solid ${props => props.theme.wallet.text.secondary};
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: ${props => props.theme.wallet.text.secondary};
    }
    :hover {
        color: ${props => props.theme.primary};
        border-color: ${props => props.theme.primary};
        svg {
            fill: ${props => props.theme.primary};
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

export const ExternalLink = styled.a`
    color: ${props => props.theme.wallet.text.secondary};
    width: 100%;
    font-size: 16px;
    margin: 0 0 20px 0;
    border: 1px solid ${props => props.theme.wallet.text.secondary};
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: ${props => props.theme.wallet.text.secondary};
        transition: all 200ms ease-in-out;
    }
    :hover {
        color: ${props => props.theme.primary};
        border-color: ${props => props.theme.primary};
        svg {
            fill: ${props => props.theme.primary};
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

const WalletInfo = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, fiatPrice, apiError } = ContextValue;
    let balances;
    let parsedTxHistory;
    let tokens;
    // use parameters from wallet.state object and not legacy separate parameters, if they are in state
    // handle edge case of user with old wallet who has not opened latest Cashtab version yet

    // If the wallet object from ContextValue has a `state key`, then check which keys are in the wallet object
    // Else set it as blank
    const paramsInWalletState = wallet.state ? Object.keys(wallet.state) : [];
    // If wallet.state includes balances and parsedTxHistory params, use these
    // These are saved in indexedDb in the latest version of the app, hence accessible more quickly
    if (
        paramsInWalletState.includes('balances') &&
        paramsInWalletState.includes('parsedTxHistory') &&
        paramsInWalletState.includes('tokens')
    ) {
        balances = wallet.state.balances;
        parsedTxHistory = wallet.state.parsedTxHistory;
        tokens = wallet.state.tokens;
    } else {
        // If balances and parsedTxHistory are not in the wallet.state object, load them from Context
        // This is how the app used to work
        balances = ContextValue.balances;
        parsedTxHistory = ContextValue.parsedTxHistory;
        tokens = ContextValue.tokens;
    }
    const [address, setAddress] = React.useState('cashAddress');
    const [activeTab, setActiveTab] = React.useState('txHistory');

    const hasHistory = parsedTxHistory && parsedTxHistory.length > 0;

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
                        <b>An error occurred on our end.</b>
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
            {hasHistory && parsedTxHistory && (
                <>
                    <Tabs>
                        <TabLabel
                            active={activeTab === 'txHistory'}
                            onClick={() => setActiveTab('txHistory')}
                        >
                            Transaction History
                        </TabLabel>
                        <TabLabel
                            active={activeTab === 'tokens'}
                            onClick={() => setActiveTab('tokens')}
                        >
                            Tokens
                        </TabLabel>
                        <TabLine left={activeTab === 'txHistory'} />
                    </Tabs>

                    <TabPane active={activeTab === 'txHistory'}>
                        <TxHistory
                            txs={parsedTxHistory}
                            fiatPrice={fiatPrice}
                        />
                        <ExternalLink
                            style={{ marginTop: '24px' }}
                            href={`${currency.blockExplorerUrl}/address/${wallet.Path1899.cashAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <LinkOutlined /> More transactions
                        </ExternalLink>
                    </TabPane>
                    <TabPane active={activeTab === 'tokens'}>
                        {tokens && tokens.length > 0 ? (
                            <TokenList tokens={tokens} />
                        ) : (
                            <p>
                                Tokens sent to your {currency.tokenTicker}{' '}
                                address will appear here
                            </p>
                        )}
                    </TabPane>
                </>
            )}
        </>
    );
};

const Wallet = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, loading } = ContextValue;

    return (
        <>
            {loading ? (
                <LoadingCtn>
                    <LoadingOutlined />
                </LoadingCtn>
            ) : (
                <>{wallet.Path1899 ? <WalletInfo /> : <OnBoarding />}</>
            )}
        </>
    );
};

export default Wallet;
