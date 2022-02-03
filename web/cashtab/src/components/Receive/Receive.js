import React from 'react';
import styled from 'styled-components';
import { WalletContext } from '@utils/context';
import OnBoarding from '@components/OnBoarding/OnBoarding';
import { QRCode } from '@components/Common/QRCode';
import { currency } from '@components/Common/Ticker.js';
import { LoadingCtn } from '@components/Common/Atoms';

export const ReceiveCtn = styled.div`
    width: 100%;
    margin-top: 100px;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
    }
`;

export const SwitchBtnCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: space-between;
    margin-bottom: 15px;
    .nonactiveBtn {
        color: ${props => props.theme.walletBackground};
        background: ${props => props.theme.contrast} !important;
        opacity: 0.7;
        box-shadow: none !important;
    }
    .slpActive {
        background: ${props => props.theme.eCashPurple} !important;
    }
`;

export const SwitchBtn = styled.div`
    font-weight: bold;
    display: inline-block;
    cursor: pointer;
    color: ${props => props.theme.switchButtonActiveText};
    font-size: 14px;
    padding: 6px 0;
    width: 100px;
    margin: 0 1px;
    text-decoration: none;
    background: ${props => props.theme.eCashBlue};
    user-select: none;
    :first-child {
        border-radius: 100px 0 0 100px;
    }
    :nth-child(2) {
        border-radius: 0 100px 100px 0;
    }
`;

const WalletInfo = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet } = ContextValue;
    const [isCashAddress, setIsCashAddress] = React.useState(true);

    const handleChangeAddress = () => {
        setIsCashAddress(!isCashAddress);
    };

    return (
        <ReceiveCtn>
            <h2>Receive {isCashAddress ? 'XEC' : 'eToken'}</h2>
            {wallet && ((wallet.Path245 && wallet.Path145) || wallet.Path1899) && (
                <>
                    {wallet.Path1899 ? (
                        <>
                            <QRCode
                                id="borderedQRCode"
                                address={
                                    isCashAddress
                                        ? wallet.Path1899.cashAddress
                                        : wallet.Path1899.slpAddress
                                }
                                isCashAddress={isCashAddress}
                            />
                        </>
                    ) : (
                        <>
                            <QRCode
                                id="borderedQRCode"
                                address={
                                    isCashAddress
                                        ? wallet.Path245.cashAddress
                                        : wallet.Path245.slpAddress
                                }
                                isCashAddress={isCashAddress}
                            />
                        </>
                    )}
                </>
            )}

            <SwitchBtnCtn>
                <SwitchBtn
                    onClick={() => handleChangeAddress()}
                    className={isCashAddress ? null : 'nonactiveBtn'}
                >
                    {currency.ticker}
                </SwitchBtn>
                <SwitchBtn
                    onClick={() => handleChangeAddress()}
                    className={isCashAddress ? 'nonactiveBtn' : 'slpActive'}
                >
                    {currency.tokenTicker}
                </SwitchBtn>
            </SwitchBtnCtn>
        </ReceiveCtn>
    );
};

const Receive = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, previousWallet, loading } = ContextValue;

    return (
        <>
            {loading ? (
                <LoadingCtn />
            ) : (
                <>
                    {(wallet && wallet.Path1899) ||
                    (previousWallet && previousWallet.path1899) ? (
                        <WalletInfo />
                    ) : (
                        <OnBoarding />
                    )}
                </>
            )}
        </>
    );
};

export default Receive;
