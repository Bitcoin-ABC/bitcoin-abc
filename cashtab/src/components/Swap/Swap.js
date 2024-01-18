import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import { getWalletState } from 'utils/cashMethods';
import { SmartButton } from 'components/Common/PrimaryButton';
import {
    WalletInfoCtn,
    ZeroBalanceHeader,
    SidePaddingCtn,
} from 'components/Common/Atoms';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import WalletLabel from 'components/Common/WalletLabel';
import { CustomCollapseCtn } from 'components/Common/StyledCollapse';
import { isValidSideshiftObj } from 'validation';
import { AlertMsg } from 'components/Common/Atoms';
import appConfig from 'config/app';

export const SwapCtn = styled.div`
    width: 100%;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

const Swap = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, cashtabSettings, changeCashtabSettings, fiatPrice } =
        ContextValue;
    const walletState = getWalletState(wallet);
    const { balances } = walletState;
    const sideshift = window.sideshift;

    return (
        <>
            <SwapCtn>
                <WalletInfoCtn>
                    <WalletLabel
                        name={wallet.name}
                        cashtabSettings={cashtabSettings}
                        changeCashtabSettings={changeCashtabSettings}
                    ></WalletLabel>
                    {!balances.totalBalance ? (
                        <ZeroBalanceHeader>
                            You currently have 0 {appConfig.ticker}
                            <br />
                            Deposit some funds to use this feature
                        </ZeroBalanceHeader>
                    ) : (
                        <>
                            <BalanceHeader
                                balance={balances.totalBalance}
                                ticker={appConfig.ticker}
                                cashtabSettings={cashtabSettings}
                            />

                            <BalanceHeaderFiat
                                balance={balances.totalBalance}
                                settings={cashtabSettings}
                                fiatPrice={fiatPrice}
                            />
                        </>
                    )}
                </WalletInfoCtn>
            </SwapCtn>
            <br />
            <SidePaddingCtn>
                <CustomCollapseCtn panelHeader="SideShift">
                    {isValidSideshiftObj(sideshift) ? (
                        <>
                            <br />
                            <SmartButton onClick={() => sideshift.show()}>
                                Open SideShift
                            </SmartButton>
                        </>
                    ) : (
                        <AlertMsg>`Error: Unable to load SideShift`</AlertMsg>
                    )}
                </CustomCollapseCtn>
            </SidePaddingCtn>
        </>
    );
};

export default Swap;
