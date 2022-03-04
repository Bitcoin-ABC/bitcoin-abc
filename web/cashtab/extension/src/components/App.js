import React, { useState } from 'react';
import 'antd/dist/antd.less';
import { Spin } from 'antd';
import {
    CashLoadingIcon,
    HomeIcon,
    SendIcon,
    ReceiveIcon,
    SettingsIcon,
} from '@components/Common/CustomIcons';
import '../index.css';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { theme } from '@assets/styles/theme';
import Home from '@components/Home/Home';
import Receive from '@components/Receive/Receive';
import Tokens from '@components/Tokens/Tokens';
import Send from '@components/Send/Send';
import SendToken from '@components/Send/SendToken';
import Configure from '@components/Configure/Configure';
import NotFound from '@components/NotFound';
import CashTab from '@assets/cashtab_xec.png';
import './App.css';
import { WalletContext } from '@utils/context';
import { isValidStoredWallet } from '@utils/cashMethods';
import {
    Route,
    Redirect,
    Switch,
    useLocation,
    useHistory,
} from 'react-router-dom';
// Extension-only import used for open in new tab link
import PopOut from '@assets/popout.svg';

const GlobalStyle = createGlobalStyle`    
    *::placeholder {
        color: ${props => props.theme.forms.placeholder} !important;
    }
    *::selection {
    background: ${props => props.theme.eCashBlue} !important;
    }
    .ant-modal-content, .ant-modal-header, .ant-modal-title {
        background-color: ${props => props.theme.modal.background} !important;
        color: ${props => props.theme.modal.color} !important;
    }
    .ant-modal-content svg {
        fill: ${props => props.theme.modal.color};
    }   
    .ant-modal-footer button {
        background-color: ${props =>
            props.theme.modal.buttonBackground} !important;
        color: ${props => props.theme.modal.color} !important;
        border-color: ${props => props.theme.modal.border} !important;
        :hover {
            background-color: ${props => props.theme.eCashBlue} !important;
        }
    }    
    .ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button, .ant-modal > button, .ant-modal-confirm-btns > button, .ant-modal-footer > button, #cropControlsConfirm{
        border-radius: 3px;
        border-radius: 3px;
        background-color: ${props =>
            props.theme.modal.buttonBackground} !important;
        color: ${props => props.theme.modal.color} !important;
        border-color: ${props => props.theme.modal.border} !important;
        :hover {
            background-color: ${props => props.theme.eCashBlue} !important;
        }
        text-shadow: none !important;
        text-shadow: none !important;
    }    
    
    .ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button:hover,.ant-modal-confirm-btns > button:hover, .ant-modal-footer > button:hover, #cropControlsConfirm:hover {
        color: ${props => props.theme.contrast};	
        transition: all 0.3s;	
        background-color: ${props => props.theme.eCashBlue};	
        border-color: ${props => props.theme.eCashBlue};
    }   
    .selectedCurrencyOption, .ant-select-dropdown {
        text-align: left;
        color: ${props => props.theme.contrast} !important;
        background-color: ${props =>
            props.theme.collapses.expandedBackground} !important;
    }
    .cashLoadingIcon {
        color: ${props => props.theme.eCashBlue} !important;
        font-size: 48px !important;
    }
    .selectedCurrencyOption:hover {
        color: ${props => props.theme.contrast} !important;
        background-color: ${props => props.theme.eCashBlue} !important;
    }
    #addrSwitch, #cropSwitch {
        .ant-switch-checked {
            background-color: white !important;
        }
    }
    #addrSwitch.ant-switch-checked, #cropSwitch.ant-switch-checked {
        background-image: ${props =>
            props.theme.buttons.primary.backgroundImage} !important;
    }

    .ant-slider-rail {
        background-color: ${props => props.theme.forms.border} !important;
    }
    .ant-slider-track {
        background-color: ${props => props.theme.eCashBlue} !important;
    }
    .ant-descriptions-bordered .ant-descriptions-row {	
    background: ${props => props.theme.contrast};	
    }	
    .ant-modal-confirm-content, .ant-modal-confirm-title {	
        color: ${props => props.theme.contrast} !important;	
    }
`;

const CustomApp = styled.div`
    text-align: center;
    font-family: 'Gilroy', sans-serif;
    font-family: 'Poppins', sans-serif;
    background-color: ${props => props.theme.backgroundColor};
    background-size: 100px 171px;
    background-image: ${props => props.theme.backgroundImage};
    background-attachment: fixed;
`;

const Footer = styled.div`
    z-index: 2;
    height: 80px;
    border-top: 1px solid rgba(255, 255, 255, 0.5);
    background-color: ${props => props.theme.footerBackground};
    position: fixed;
    bottom: 0;
    width: 500px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 50px;
    @media (max-width: 768px) {
        width: 100%;
        padding: 0 20px;
    }
`;

export const NavButton = styled.button`
    :focus,
    :active {
        outline: none;
    }
    cursor: pointer;
    padding: 0;
    background: none;
    border: none;
    font-size: 10px;
    svg {
        fill: ${props => props.theme.contrast};
        width: 26px;
        height: auto;
    }
    ${({ active, ...props }) =>
        active &&
        `    	
        color: ${props.theme.navActive};	
        svg {	
            fill: ${props.theme.navActive};	
        }	
  `}
`;

export const WalletBody = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
`;

export const WalletCtn = styled.div`
    position: relative;
    width: 500px;
    min-height: 100vh;
    padding: 0 0 100px;
    background: ${props => props.theme.walletBackground};
    -webkit-box-shadow: 0px 0px 24px 1px ${props => props.theme.shadow};
    -moz-box-shadow: 0px 0px 24px 1px ${props => props.theme.shadow};
    box-shadow: 0px 0px 24px 1px ${props => props.theme.shadow};
    @media (max-width: 768px) {
        width: 100%;
        -webkit-box-shadow: none;
        -moz-box-shadow: none;
        box-shadow: none;
    }
`;

export const HeaderCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 15px;
`;

export const CashTabLogo = styled.img`
    width: 120px;
    @media (max-width: 768px) {
        width: 110px;
    }
`;

// Extension only styled components
const OpenInTabBtn = styled.button`
    background: none;
    border: none;
`;

const ExtTabImg = styled.img`
    max-width: 20px;
`;

const App = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, loading } = ContextValue;
    const [loadingUtxosAfterSend, setLoadingUtxosAfterSend] = useState(false);
    // If wallet is unmigrated, do not show page until it has migrated
    // An invalid wallet will be validated/populated after the next API call, ETA 10s
    const validWallet = isValidStoredWallet(wallet);
    const location = useLocation();
    const history = useHistory();
    const selectedKey =
        location && location.pathname ? location.pathname.substr(1) : '';
    // openInTab is an extension-only method
    const openInTab = () => {
        window.open(`index.html#/${selectedKey}`);
    };

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <Spin
                spinning={
                    loading || loadingUtxosAfterSend || (wallet && !validWallet)
                }
                indicator={CashLoadingIcon}
            >
                <CustomApp>
                    <WalletBody>
                        <WalletCtn>
                            <HeaderCtn>
                                <CashTabLogo src={CashTab} alt="cashtab" />
                                {/*Begin extension-only components*/}
                                <OpenInTabBtn
                                    data-tip="Open in tab"
                                    onClick={() => openInTab()}
                                >
                                    <ExtTabImg src={PopOut} alt="Open in tab" />
                                </OpenInTabBtn>
                                {/*End extension-only components*/}
                            </HeaderCtn>
                            {/*Note that the extension does not support biometric security*/}
                            {/*Hence <ProtectableComponentWrapper> is not pulled in*/}
                            <Switch>
                                <Route path="/wallet">
                                    <Home />
                                </Route>
                                <Route path="/receive">
                                    <Receive
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route path="/tokens">
                                    <Tokens
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route path="/send">
                                    <Send
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route
                                    path="/send-token/:tokenId"
                                    render={props => (
                                        <SendToken
                                            tokenId={props.match.params.tokenId}
                                            passLoadingStatus={
                                                setLoadingUtxosAfterSend
                                            }
                                        />
                                    )}
                                />
                                <Route path="/configure">
                                    <Configure />
                                </Route>
                                <Redirect exact from="/" to="/wallet" />
                                <Route component={NotFound} />
                            </Switch>
                        </WalletCtn>
                        {wallet ? (
                            <Footer>
                                <NavButton
                                    active={selectedKey === 'wallet'}
                                    onClick={() => history.push('/wallet')}
                                >
                                    <HomeIcon />
                                </NavButton>

                                <NavButton
                                    active={selectedKey === 'send'}
                                    onClick={() => history.push('/send')}
                                >
                                    <SendIcon
                                        style={{
                                            marginTop: '-9px',
                                        }}
                                    />
                                </NavButton>
                                <NavButton
                                    active={selectedKey === 'receive'}
                                    onClick={() => history.push('receive')}
                                >
                                    <ReceiveIcon />
                                </NavButton>
                                <NavButton
                                    active={selectedKey === 'configure'}
                                    onClick={() => history.push('/configure')}
                                >
                                    <SettingsIcon />
                                </NavButton>
                            </Footer>
                        ) : null}
                    </WalletBody>
                </CustomApp>
            </Spin>
        </ThemeProvider>
    );
};

export default App;
