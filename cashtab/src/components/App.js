import React, { useState } from 'react';
import 'antd/dist/antd.less';
import PropTypes from 'prop-types';
import { Spin } from 'antd';
import {
    CashLoadingIcon,
    HomeIcon,
    SendIcon,
    ReceiveIcon,
    SettingsIcon,
    AirdropIcon,
    ThemedSignAndVerifyMsg,
    ThemedUserProfileIcon,
    SwapIcon,
    EtokensIcon,
} from 'components/Common/CustomIcons';
import '../index.css';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Home from 'components/Home/Home';
import Receive from 'components/Receive/Receive';
import CreateToken from 'components/Etokens/CreateToken';
import SendXec from 'components/Send/SendXec';
import SendToken from 'components/Send/SendToken';
import Airdrop from 'components/Airdrop/Airdrop';
import Alias from 'components/Alias/Alias';
import Etokens from 'components/Etokens/Etokens';
import Configure from 'components/Configure/Configure';
import SignVerifyMsg from 'components/SignVerifyMsg/SignVerifyMsg';
import Swap from 'components/Swap/Swap';
import NotFound from 'components/NotFound';
import Cashtab from 'assets/cashtab_xec.png';
import './App.css';
import { WalletContext } from 'utils/context';
import { isValidStoredWallet } from 'utils/cashMethods';
import {
    Route,
    Redirect,
    Switch,
    useLocation,
    useHistory,
} from 'react-router-dom';
// Easter egg imports not used in extension/src/components/App.js
import TabCash from 'assets/tabcash.png';
import { checkForTokenById } from 'utils/tokenMethods.js';
import ServiceWorkerWrapper from './Common/ServiceWorkerWrapper';
import aliasSettings from 'config/alias';
import WebApp from './AppModes/WebApp';
import Extension from './AppModes/Extension';
import ExtensionHeader from './Common/ExtensionHeader';

const ExtensionFrame = createGlobalStyle`
    html, body {
        min-width: 400px;
        min-height: 600px;
    }
`;

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
    .ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button, .ant-modal > button, .ant-modal-confirm-btns > button, .ant-modal-footer > button, #cropControlsConfirm {
        border-radius: 3px;
        background-color: ${props =>
            props.theme.modal.buttonBackground} !important;
        color: ${props => props.theme.modal.color} !important;
        border-color: ${props => props.theme.modal.border} !important;
        :hover {
            background-color: ${props => props.theme.eCashBlue} !important;
        }
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
    .ant-form-item-explain {
        div {
            color: ${props => props.theme.forms.text};
        }
    }
    .ant-input-prefix {
        color: ${props => props.theme.eCashBlue};
    }
    .ant-spin-nested-loading>div>.ant-spin .ant-spin-dot {
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        margin: auto !important;
    }
    .ant-spin-nested-loading>div>.ant-spin {
        position: fixed !important;
    }
`;

const CustomApp = styled.div`
    text-align: center;
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
    padding: 0;
    @media (max-width: 768px) {
        width: 100%;
    }
`;

const NavWrapper = styled.div`
    width: 100%;
    height: 100%;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 1.3rem;
    margin-bottom: 5px;
`;

const NavIcon = styled.span`
    @media (hover: hover) {
        ${NavWrapper}:hover & {
            background-color: ${props =>
                props.clicked ? 'transparent' : props.theme.eCashPurple};
            ::before,
            ::after {
                background-color: ${props => props.theme.eCashPurple};
            }
        }
    }

    position: relative;
    background-color: ${props =>
        props.clicked ? 'transparent' : props.theme.buttons.primary.color};
    width: 2rem;
    height: 2px;
    display: inline-block;
    transition: transform 300ms, top 300ms, background-color 300ms;
    &::before,
    &::after {
        content: '';
        background-color: ${props => props.theme.buttons.primary.color};
        width: 2rem;
        height: 2px;
        display: inline-block;
        position: absolute;
        left: 0;
        transition: transform 300ms, top 300ms, background-color 300ms;
    }
    &::before {
        top: ${props => (props.clicked ? '0' : '-0.8rem')};
        transform: ${props => (props.clicked ? 'rotate(135deg)' : 'rotate(0)')};
    }
    &::after {
        top: ${props => (props.clicked ? '0' : '0.8rem')};
        transform: ${props =>
            props.clicked ? 'rotate(-135deg)' : 'rotate(0)'};
    }
`;

const NavMenu = styled.div`
    position: fixed;
    float: right;
    margin-right: 30px;
    bottom: 5rem;
    display: flex;
    width: 8.23rem;
    flex-direction: column;
    border: ${props => (props.open ? '1px solid' : '0px solid')};
    border-color: ${props =>
        props.open ? props.theme.contrast : 'transparent'};
    justify-content: center;
    align-items: center;

    @media (max-width: 768px) {
        right: 0;
        margin-right: 0;
    }
    overflow: hidden;
    transition: ${props =>
        props.open
            ? 'max-height 1000ms ease-in-out , border-color 800ms ease-in-out, border-width 800ms ease-in-out'
            : 'max-height 300ms cubic-bezier(0, 1, 0, 1), border-color 600ms ease-in-out, border-width 800ms ease-in-out'};
    max-height: ${props => (props.open ? '100rem' : '0')};
`;

const NavItem = styled.button`
    display: flex;
    justify-content: right;
    align-items: center;
    width: 100%;
    white-space: nowrap;
    height: 3rem;
    background-color: ${props => props.theme.walletBackground};
    border: none;
    color: ${props => props.theme.contrast};
    gap: 6px;
    cursor: pointer;
    &:hover {
        color: ${props => props.theme.eCashPurple};
        svg {
            fill: ${props => props.theme.eCashPurple};
        }
    }
    svg {
        fill: ${props => props.theme.contrast};
        max-width: 26px;
        height: auto;
        flex: 1;
    }
    p {
        flex: 2;
        margin: 0;
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

export const NavButton = styled.button`
    :focus,
    :active {
        outline: none;
    }
    @media (hover: hover) {
        :hover {
            svg {
                fill: ${props => props.theme.eCashPurple};
            }
        }
    }
    width: 100%;
    height: 100%;
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
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 15px 0;
`;

export const CashtabLogo = styled.img`
    width: 120px;
    @media (max-width: 768px) {
        width: 110px;
    }
`;

// AbcLogo styled component not included in extension, replaced by open in new tab link
export const AbcLogo = styled.img`
    width: 150px;
    @media (max-width: 768px) {
        width: 120px;
    }
`;

// Easter egg styled component not used in extension/src/components/App.js
export const EasterEgg = styled.img`
    position: fixed;
    bottom: -195px;
    margin: 0;
    right: 10%;
    transition-property: bottom;
    transition-duration: 1.5s;
    transition-timing-function: ease-out;

    :hover {
        bottom: 0;
    }

    @media screen and (max-width: 1250px) {
        display: none;
    }
`;

const NavHeader = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 1rem;
    color: ${props => props.theme.navActive};
    svg {
        padding: 0.2rem;
        fill: ${props => props.theme.navActive};
        height: 33px;
        width: 30px;
    }
`;

const App = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, loading } = ContextValue;
    const [loadingUtxosAfterSend, setLoadingUtxosAfterSend] = useState(false);
    const [updatingWalletInfo, setUpdatingWalletInfo] = useState(false);
    const [navMenuClicked, setNavMenuClicked] = useState(false);
    const handleNavMenuClick = () => setNavMenuClicked(!navMenuClicked);
    // If wallet is unmigrated, do not show page until it has migrated
    // An invalid wallet will be validated/populated after the next API call, ETA 10s
    const validWallet = isValidStoredWallet(wallet);
    const location = useLocation();
    const history = useHistory();
    const selectedKey =
        location && location.pathname ? location.pathname.substr(1) : '';

    // Easter egg boolean not used in extension/src/components/App.js
    const hasTab = validWallet
        ? checkForTokenById(
              wallet.state.tokens,
              '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
          )
        : false;

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            {process.env.REACT_APP_BUILD_ENV === 'extension' ? (
                <>
                    <ExtensionFrame />
                    <Extension wallet={wallet} />
                </>
            ) : (
                <>
                    <ServiceWorkerWrapper />
                    <WebApp />
                </>
            )}
            <Spin
                spinning={
                    loading ||
                    loadingUtxosAfterSend ||
                    updatingWalletInfo ||
                    (wallet && !validWallet)
                }
                indicator={CashLoadingIcon}
            >
                <CustomApp>
                    <WalletBody>
                        <WalletCtn>
                            <HeaderCtn>
                                {process.env.REACT_APP_BUILD_ENV ===
                                'extension' ? (
                                    <ExtensionHeader
                                        selectedKey={selectedKey}
                                    />
                                ) : (
                                    <CashtabLogo src={Cashtab} alt="cashtab" />
                                )}
                                {selectedKey === 'airdrop' && (
                                    <NavHeader>
                                        Airdrop
                                        <AirdropIcon />
                                    </NavHeader>
                                )}
                                {selectedKey === 'configure' && (
                                    <NavHeader>
                                        Settings
                                        <SettingsIcon />
                                    </NavHeader>
                                )}
                                {selectedKey === 'signverifymsg' && (
                                    <NavHeader>
                                        {' '}
                                        Sign & Verify Msg
                                        <ThemedSignAndVerifyMsg />
                                    </NavHeader>
                                )}
                                {process.env.REACT_APP_BUILD_ENV !==
                                    'extension' && (
                                    <>
                                        {selectedKey === 'swap' && (
                                            <NavHeader>
                                                {' '}
                                                Swap
                                                <SwapIcon />
                                            </NavHeader>
                                        )}
                                    </>
                                )}
                                {process.env.REACT_APP_BUILD_ENV !==
                                    'extension' && (
                                    <>
                                        {hasTab && (
                                            <EasterEgg
                                                src={TabCash}
                                                alt="tabcash"
                                            />
                                        )}
                                    </>
                                )}
                            </HeaderCtn>
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
                                <Route path="/create-token">
                                    <CreateToken
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route path="/send">
                                    <SendXec
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
                                <Route path="/airdrop">
                                    <Airdrop
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route path="/etokens">
                                    <Etokens
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route path="/signverifymsg">
                                    <SignVerifyMsg />
                                </Route>
                                {aliasSettings.aliasEnabled && (
                                    <Route path="/alias">
                                        <Alias
                                            passLoadingStatus={
                                                setLoadingUtxosAfterSend
                                            }
                                        />
                                    </Route>
                                )}
                                <Route path="/configure">
                                    <Configure
                                        passLoadingStatus={
                                            setUpdatingWalletInfo
                                        }
                                    />
                                </Route>
                                {process.env.REACT_APP_BUILD_ENV !==
                                    'extension' && (
                                    <Route path="/swap">
                                        <Swap />
                                    </Route>
                                )}
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
                                    active={selectedKey === 'etokens'}
                                    onClick={() => history.push('/etokens')}
                                >
                                    <EtokensIcon
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
                                <NavWrapper onClick={handleNavMenuClick}>
                                    <NavIcon clicked={navMenuClicked} />
                                    <NavMenu open={navMenuClicked}>
                                        <NavItem
                                            active={selectedKey === 'airdrop'}
                                            onClick={() =>
                                                history.push('/airdrop')
                                            }
                                        >
                                            {' '}
                                            <p>Airdrop</p>
                                            <AirdropIcon />
                                        </NavItem>
                                        {process.env.REACT_APP_BUILD_ENV !==
                                            'extension' && (
                                            <NavItem
                                                active={selectedKey === 'swap'}
                                                onClick={() =>
                                                    history.push('/swap')
                                                }
                                            >
                                                {' '}
                                                <p>Swap</p>
                                                <SwapIcon />
                                            </NavItem>
                                        )}
                                        <NavItem
                                            active={
                                                selectedKey === 'signverifymsg'
                                            }
                                            onClick={() =>
                                                history.push('/signverifymsg')
                                            }
                                        >
                                            <p>Sign & Verify</p>
                                            <ThemedSignAndVerifyMsg />
                                        </NavItem>
                                        {aliasSettings.aliasEnabled && (
                                            <NavItem
                                                active={selectedKey === 'alias'}
                                                onClick={() =>
                                                    history.push('/alias')
                                                }
                                            >
                                                {' '}
                                                <p>Alias</p>
                                                <ThemedUserProfileIcon />
                                            </NavItem>
                                        )}
                                        <NavItem
                                            active={selectedKey === 'configure'}
                                            onClick={() =>
                                                history.push('/configure')
                                            }
                                        >
                                            <p>Settings</p>
                                            <SettingsIcon />
                                        </NavItem>
                                    </NavMenu>
                                </NavWrapper>
                            </Footer>
                        ) : null}
                    </WalletBody>
                </CustomApp>
            </Spin>
        </ThemeProvider>
    );
};

App.propTypes = {
    match: PropTypes.string,
};

export default App;
