// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import {
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
    TokensIcon,
} from 'components/Common/CustomIcons';
import Spinner from 'components/Common/Spinner';
import { ThemeProvider } from 'styled-components';
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
import WalletLabel from 'components/Common/WalletLabel.js';
import BalanceHeader from 'components/Common/BalanceHeader';
import { isValidCashtabWallet } from 'validation';
import { Bounce } from 'react-toastify';
import {
    ExtensionFrame,
    GlobalStyle,
    CashtabNotification,
    CustomApp,
    Footer,
    Header,
    NavWrapper,
    NavItem,
    NavIcon,
    NavMenu,
    NavButton,
    WalletBody,
    ScreenWrapper,
    WalletCtn,
    HeaderCtn,
    CashtabLogo,
    EasterEgg,
    NavHeader,
    WalletInfoCtn,
} from 'components/App/styles';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import 'react-toastify/dist/ReactToastify.min.css';

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
    const [scrollYPosition, setScrollYPosition] = React.useState(0);
    const handleNavMenuClick = () => setNavMenuClicked(!navMenuClicked);
    // If wallet is unmigrated, do not show page until it has migrated
    // An invalid wallet will be validated/populated after the next API call, ETA 10s
    const validWallet = isValidCashtabWallet(wallet);
    const location = useLocation();
    const navigate = useNavigate();

    const handleScroll = () => {
        setScrollYPosition(window.scrollY);
    };

    // To avoid content jump flickering without using overflow-anchor,
    // This cannot exceed the height of the minified wallet menu
    // overflow-anchor css rule is not supported across all browsers and devices
    // WalletInfoCtn has height set to 63px in styles.js
    const PIN_MINIFIED_WALLET_MENU_SCROLLY = 63;
    const UNPIN_MINIFIED_WALLET_MENU_SCROLLY = 15;
    const minifiedMenu =
        scrollYPosition > PIN_MINIFIED_WALLET_MENU_SCROLLY
            ? true
            : scrollYPosition < UNPIN_MINIFIED_WALLET_MENU_SCROLLY
            ? false
            : true;

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

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

            {loading ||
                spinner ||
                (wallet !== false && !validWallet && <Spinner />)}
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
                            <LoadingCtn title="Cashtab Loading" />
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
                                                {selectedKey === 'airdrop' && (
                                                    <NavHeader>
                                                        Airdrop
                                                        <AirdropIcon />
                                                    </NavHeader>
                                                )}
                                                {selectedKey === 'backup' && (
                                                    <NavHeader>
                                                        Wallet Backup
                                                        <WalletIcon />
                                                    </NavHeader>
                                                )}
                                                {selectedKey === 'contacts' && (
                                                    <NavHeader>
                                                        Contacts
                                                        <ContactsIcon />
                                                    </NavHeader>
                                                )}
                                                {selectedKey === 'wallets' && (
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
                                                                src={TabCash}
                                                                alt="tabcash"
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </HeaderCtn>
                                            <WalletInfoCtn
                                                title="Wallet Info"
                                                minified={minifiedMenu}
                                            >
                                                <WalletLabel
                                                    wallets={wallets}
                                                    settings={settings}
                                                    updateCashtabState={
                                                        updateCashtabState
                                                    }
                                                    minified={minifiedMenu}
                                                ></WalletLabel>
                                                <BalanceHeader
                                                    balanceSats={balanceSats}
                                                    settings={settings}
                                                    fiatPrice={fiatPrice}
                                                    locale={navigator.language}
                                                    minified={minifiedMenu}
                                                />
                                                {minifiedMenu && (
                                                    <WalletHeaderActions
                                                        address={
                                                            wallets[0].paths.get(
                                                                1899,
                                                            ).address
                                                        }
                                                        settings={settings}
                                                        updateCashtabState={
                                                            updateCashtabState
                                                        }
                                                    />
                                                )}
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
                                                    element={<CreateToken />}
                                                />

                                                <Route
                                                    path="/send"
                                                    element={<SendXec />}
                                                />
                                                <Route path="send-token">
                                                    <Route
                                                        path=":tokenId"
                                                        element={<SendToken />}
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
                                                    element={<BackupWallet />}
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
                                                    element={<SignVerifyMsg />}
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
                                aria-label="Send Screen"
                                active={selectedKey === 'send'}
                                onClick={() => navigate('/send')}
                                style={{ paddingBottom: '10px' }}
                            >
                                <SendIcon />
                            </NavButton>
                            <NavButton
                                aria-label="Tokens"
                                active={selectedKey === 'etokens'}
                                onClick={() => navigate('/etokens')}
                            >
                                <TokensIcon />
                            </NavButton>
                            <NavButton
                                aria-label="Receive"
                                active={selectedKey === 'receive'}
                                onClick={() => navigate('receive')}
                            >
                                <ReceiveIcon />
                            </NavButton>
                            <NavWrapper
                                title="Show Other Screens"
                                onClick={handleNavMenuClick}
                            >
                                <NavIcon clicked={navMenuClicked} />
                                <NavMenu
                                    title="Other Screens"
                                    open={navMenuClicked}
                                >
                                    <NavItem
                                        active={selectedKey === 'backup'}
                                        onClick={() => navigate('/backup')}
                                    >
                                        {' '}
                                        <p>Wallet Backup</p>
                                        <WalletIcon />
                                    </NavItem>
                                    <NavItem
                                        active={selectedKey === 'wallets'}
                                        onClick={() => navigate('/wallets')}
                                    >
                                        {' '}
                                        <p>Wallets</p>
                                        <BankIcon />
                                    </NavItem>
                                    <NavItem
                                        active={selectedKey === 'contacts'}
                                        onClick={() => navigate('/contacts')}
                                    >
                                        {' '}
                                        <p>Contacts</p>
                                        <ContactsIcon />
                                    </NavItem>
                                    <NavItem
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
                                            active={selectedKey === 'swap'}
                                            onClick={() => navigate('/swap')}
                                        >
                                            {' '}
                                            <p>Swap</p>
                                            <SwapIcon />
                                        </NavItem>
                                    )}
                                    <NavItem
                                        active={selectedKey === 'signverifymsg'}
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
                                            onClick={() => navigate('/alias')}
                                        >
                                            {' '}
                                            <p>Alias</p>
                                            <ThemedUserProfileIcon />
                                        </NavItem>
                                    )}
                                    <NavItem
                                        active={selectedKey === 'configure'}
                                        onClick={() => navigate('/configure')}
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
        </ThemeProvider>
    );
};

export default App;
