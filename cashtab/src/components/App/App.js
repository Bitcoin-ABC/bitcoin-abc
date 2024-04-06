// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import { Spin } from 'antd';
import {
    CashLoadingIcon,
    HomeIcon,
    SendIcon,
    ReceiveIcon,
    SettingsIcon,
    AirdropIcon,
    BankIcon,
    WalletIcon,
    ContactsIcon,
    ThemedSignAndVerifyMsg,
    ThemedUserProfileIcon,
    SwapIcon,
    EtokensIcon,
} from 'components/Common/CustomIcons';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Home from 'components/Home/Home';
import Receive from 'components/Receive/Receive';
import CreateToken from 'components/Etokens/CreateToken';
import SendXec from 'components/Send/SendXec';
import SendToken from 'components/Send/SendToken';
import Airdrop from 'components/Airdrop/Airdrop';
import BackupWallet from 'components/BackupWallet/BackupWallet';
import Contacts from 'components/Contacts';
import Wallets from 'components/Wallets';
import Alias from 'components/Alias/Alias';
import Etokens from 'components/Etokens/Etokens';
import Configure from 'components/Configure/Configure';
import SignVerifyMsg from 'components/SignVerifyMsg/SignVerifyMsg';
import Swap from 'components/Swap/Swap';
import NotFound from 'components/App/NotFound';
import OnBoarding from 'components/OnBoarding/OnBoarding';
import { LoadingCtn } from 'components/Common/Atoms';
import Cashtab from 'assets/cashtab_xec.png';
import './App.css';
import { WalletContext } from 'wallet/context';
import { getWalletState } from 'utils/cashMethods';
import {
    Route,
    Navigate,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';
// Easter egg imports not used in extension/src/components/App.js
import TabCash from 'assets/tabcash.png';
import { hasEnoughToken } from 'wallet';
import ServiceWorkerWrapper from 'components/Common/ServiceWorkerWrapper';
import aliasSettings from 'config/alias';
import WebApp from 'components/AppModes/WebApp';
import Extension from 'components/AppModes/Extension';
import ExtensionHeader from 'components/Common/ExtensionHeader';
import { WalletInfoCtn } from 'components/Common/Atoms';
import WalletLabel from 'components/Common/WalletLabel.js';
import BalanceHeader from 'components/Common/BalanceHeader';
import { isValidCashtabWallet } from 'validation';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

const CashtabNotification = styled(ToastContainer)`
    .Toastify__progress-bar-theme--dark {
        background: #00abe7;
    }
    .Toastify__progress-bar-theme--light {
        background: #00abe7;
    }
`;

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
    background-color: ${props => props.theme.headerAndFooterBg};
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

const Header = styled.div`
    z-index: 2;

    background-color: ${props => props.theme.headerAndFooterBg};
    position: sticky;
    top: 0;
    width: 500px;
    align-items: center;
    justify-content: space-between;

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
export const ScreenWrapper = styled.div`
    padding: 0px 30px;
    @media (max-width: 768px) {
        padding: 0px 15px;
    }
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
    const {
        cashtabState,
        updateCashtabState,
        fiatPrice,
        loading,
        cashtabLoaded,
    } = ContextValue;
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { balanceSats } = walletState;
    const [spinner, setSpinner] = useState(false);
    const [navMenuClicked, setNavMenuClicked] = useState(false);
    const handleNavMenuClick = () => setNavMenuClicked(!navMenuClicked);
    // If wallet is unmigrated, do not show page until it has migrated
    // An invalid wallet will be validated/populated after the next API call, ETA 10s
    const validWallet = isValidCashtabWallet(wallet);
    const location = useLocation();
    const navigate = useNavigate();

    const selectedKey =
        location && location.pathname ? location.pathname.substr(1) : '';

    // Easter egg boolean not used in extension/src/components/App.js
    const hasTab = validWallet
        ? hasEnoughToken(
              wallet.state.tokens,
              '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
              1,
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
                    loading || spinner || (wallet !== false && !validWallet)
                }
                indicator={CashLoadingIcon}
            >
                <CustomApp>
                    <CashtabNotification
                        position="top-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                        transition={Bounce}
                    />
                    <WalletBody>
                        <WalletCtn>
                            {!cashtabLoaded ? (
                                <LoadingCtn data-testid="loading-ctn" />
                            ) : (
                                <>
                                    {wallet === false ? (
                                        <OnBoarding />
                                    ) : (
                                        <>
                                            <Header>
                                                <HeaderCtn>
                                                    {process.env
                                                        .REACT_APP_BUILD_ENV ===
                                                    'extension' ? (
                                                        <ExtensionHeader
                                                            selectedKey={
                                                                selectedKey
                                                            }
                                                        />
                                                    ) : (
                                                        <CashtabLogo
                                                            src={Cashtab}
                                                            alt="cashtab"
                                                        />
                                                    )}
                                                    {selectedKey ===
                                                        'airdrop' && (
                                                        <NavHeader>
                                                            Airdrop
                                                            <AirdropIcon />
                                                        </NavHeader>
                                                    )}
                                                    {selectedKey ===
                                                        'backup' && (
                                                        <NavHeader>
                                                            Wallet Backup
                                                            <WalletIcon />
                                                        </NavHeader>
                                                    )}
                                                    {selectedKey ===
                                                        'contacts' && (
                                                        <NavHeader>
                                                            Contacts
                                                            <ContactsIcon />
                                                        </NavHeader>
                                                    )}
                                                    {selectedKey ===
                                                        'wallets' && (
                                                        <NavHeader>
                                                            Wallets
                                                            <BankIcon />
                                                        </NavHeader>
                                                    )}
                                                    {selectedKey ===
                                                        'configure' && (
                                                        <NavHeader>
                                                            Settings
                                                            <SettingsIcon />
                                                        </NavHeader>
                                                    )}
                                                    {selectedKey ===
                                                        'signverifymsg' && (
                                                        <NavHeader>
                                                            {' '}
                                                            Sign & Verify Msg
                                                            <ThemedSignAndVerifyMsg />
                                                        </NavHeader>
                                                    )}
                                                    {process.env
                                                        .REACT_APP_BUILD_ENV !==
                                                        'extension' && (
                                                        <>
                                                            {selectedKey ===
                                                                'swap' && (
                                                                <NavHeader>
                                                                    {' '}
                                                                    Swap
                                                                    <SwapIcon />
                                                                </NavHeader>
                                                            )}
                                                        </>
                                                    )}
                                                    {process.env
                                                        .REACT_APP_BUILD_ENV !==
                                                        'extension' && (
                                                        <>
                                                            {hasTab && (
                                                                <EasterEgg
                                                                    src={
                                                                        TabCash
                                                                    }
                                                                    alt="tabcash"
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </HeaderCtn>
                                                <WalletInfoCtn data-testid="wallet-info-ctn">
                                                    <WalletLabel
                                                        wallets={wallets}
                                                        settings={settings}
                                                        updateCashtabState={
                                                            updateCashtabState
                                                        }
                                                    ></WalletLabel>
                                                    <BalanceHeader
                                                        balanceSats={
                                                            balanceSats
                                                        }
                                                        settings={settings}
                                                        fiatPrice={fiatPrice}
                                                        locale={
                                                            navigator.language
                                                        }
                                                    />
                                                </WalletInfoCtn>
                                            </Header>
                                            <ScreenWrapper>
                                                <Routes>
                                                    <Route
                                                        path="/wallet"
                                                        element={<Home />}
                                                    />
                                                    <Route
                                                        path="/receive"
                                                        element={<Receive />}
                                                    />

                                                    <Route
                                                        path="/create-token"
                                                        element={
                                                            <CreateToken />
                                                        }
                                                    />

                                                    <Route
                                                        path="/send"
                                                        element={<SendXec />}
                                                    />
                                                    <Route path="send-token">
                                                        <Route
                                                            path=":tokenId"
                                                            element={
                                                                <SendToken />
                                                            }
                                                        />
                                                    </Route>
                                                    <Route
                                                        path="/airdrop"
                                                        element={
                                                            <Airdrop
                                                                passLoadingStatus={
                                                                    setSpinner
                                                                }
                                                            />
                                                        }
                                                    />
                                                    <Route
                                                        path="/backup"
                                                        element={
                                                            <BackupWallet />
                                                        }
                                                    />
                                                    <Route
                                                        path="/wallets"
                                                        element={<Wallets />}
                                                    />
                                                    <Route
                                                        path="/contacts"
                                                        element={<Contacts />}
                                                    />

                                                    <Route
                                                        path="/etokens"
                                                        element={<Etokens />}
                                                    />
                                                    <Route
                                                        path="/signverifymsg"
                                                        element={
                                                            <SignVerifyMsg />
                                                        }
                                                    />
                                                    {aliasSettings.aliasEnabled && (
                                                        <Route
                                                            path="/alias"
                                                            element={
                                                                <Alias
                                                                    passLoadingStatus={
                                                                        setSpinner
                                                                    }
                                                                />
                                                            }
                                                        />
                                                    )}
                                                    <Route
                                                        path="/configure"
                                                        element={<Configure />}
                                                    />
                                                    {process.env
                                                        .REACT_APP_BUILD_ENV !==
                                                        'extension' && (
                                                        <Route
                                                            path="/swap"
                                                            element={<Swap />}
                                                        />
                                                    )}
                                                    <Route
                                                        path="/"
                                                        element={
                                                            <Navigate
                                                                to="/wallet"
                                                                replace
                                                            />
                                                        }
                                                    />
                                                    <Route
                                                        path="*"
                                                        element={<NotFound />}
                                                    />
                                                </Routes>
                                            </ScreenWrapper>
                                        </>
                                    )}
                                </>
                            )}
                        </WalletCtn>
                        {wallet !== false && (
                            <Footer>
                                <NavButton
                                    active={selectedKey === 'wallet'}
                                    onClick={() => navigate('/wallet')}
                                >
                                    <HomeIcon />
                                </NavButton>

                                <NavButton
                                    data-testid="nav-btn-send"
                                    active={selectedKey === 'send'}
                                    onClick={() => navigate('/send')}
                                >
                                    <SendIcon
                                        style={{
                                            marginTop: '-9px',
                                        }}
                                    />
                                </NavButton>
                                <NavButton
                                    data-testid="nav-btn-etokens"
                                    active={selectedKey === 'etokens'}
                                    onClick={() => navigate('/etokens')}
                                >
                                    <EtokensIcon
                                        style={{
                                            marginTop: '-9px',
                                        }}
                                    />
                                </NavButton>
                                <NavButton
                                    data-testid="nav-btn-receive"
                                    active={selectedKey === 'receive'}
                                    onClick={() => navigate('receive')}
                                >
                                    <ReceiveIcon />
                                </NavButton>
                                <NavWrapper
                                    data-testid="hamburger"
                                    onClick={handleNavMenuClick}
                                >
                                    <NavIcon clicked={navMenuClicked} />
                                    <NavMenu
                                        data-testid="hamburger-menu"
                                        open={navMenuClicked}
                                    >
                                        <NavItem
                                            data-testid="nav-btn-backup"
                                            active={selectedKey === 'backup'}
                                            onClick={() => navigate('/backup')}
                                        >
                                            {' '}
                                            <p>Wallet Backup</p>
                                            <WalletIcon />
                                        </NavItem>
                                        <NavItem
                                            data-testid="nav-btn-wallets"
                                            active={selectedKey === 'wallets'}
                                            onClick={() => navigate('/wallets')}
                                        >
                                            {' '}
                                            <p>Wallets</p>
                                            <BankIcon />
                                        </NavItem>
                                        <NavItem
                                            data-testid="nav-btn-contacts"
                                            active={selectedKey === 'contacts'}
                                            onClick={() =>
                                                navigate('/contacts')
                                            }
                                        >
                                            {' '}
                                            <p>Contacts</p>
                                            <ContactsIcon />
                                        </NavItem>
                                        <NavItem
                                            data-testid="nav-btn-airdrop"
                                            active={selectedKey === 'airdrop'}
                                            onClick={() => navigate('/airdrop')}
                                        >
                                            {' '}
                                            <p>Airdrop</p>
                                            <AirdropIcon />
                                        </NavItem>
                                        {process.env.REACT_APP_BUILD_ENV !==
                                            'extension' && (
                                            <NavItem
                                                data-testid="nav-btn-swap"
                                                active={selectedKey === 'swap'}
                                                onClick={() =>
                                                    navigate('/swap')
                                                }
                                            >
                                                {' '}
                                                <p>Swap</p>
                                                <SwapIcon />
                                            </NavItem>
                                        )}
                                        <NavItem
                                            data-testid="nav-btn-signverifymsg"
                                            active={
                                                selectedKey === 'signverifymsg'
                                            }
                                            onClick={() =>
                                                navigate('/signverifymsg')
                                            }
                                        >
                                            <p>Sign & Verify</p>
                                            <ThemedSignAndVerifyMsg />
                                        </NavItem>
                                        {aliasSettings.aliasEnabled && (
                                            <NavItem
                                                active={selectedKey === 'alias'}
                                                onClick={() =>
                                                    navigate('/alias')
                                                }
                                            >
                                                {' '}
                                                <p>Alias</p>
                                                <ThemedUserProfileIcon />
                                            </NavItem>
                                        )}
                                        <NavItem
                                            data-testid="nav-btn-configure"
                                            active={selectedKey === 'configure'}
                                            onClick={() =>
                                                navigate('/configure')
                                            }
                                        >
                                            <p>Settings</p>
                                            <SettingsIcon />
                                        </NavItem>
                                    </NavMenu>
                                </NavWrapper>
                            </Footer>
                        )}
                    </WalletBody>
                </CustomApp>
            </Spin>
        </ThemeProvider>
    );
};

export default App;
