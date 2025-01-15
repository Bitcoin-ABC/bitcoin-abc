// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useContext } from 'react';
import { Tooltip } from 'react-tooltip';
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
    TokensIcon,
    RewardIcon,
    NftIcon,
    DogeIcon,
} from 'components/Common/CustomIcons';
import Spinner from 'components/Common/Spinner';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Home from 'components/Home/Home';
import Receive from 'components/Receive/Receive';
import CreateToken from 'components/Etokens/CreateToken';
import SendXec from 'components/Send/SendXec';
import Token from 'components/Etokens/Token';
import Airdrop from 'components/Airdrop';
import BackupWallet from 'components/BackupWallet/BackupWallet';
import Contacts from 'components/Contacts';
import Wallets from 'components/Wallets';
import Etokens from 'components/Etokens/Etokens';
import Configure from 'components/Configure/Configure';
import SignVerifyMsg from 'components/SignVerifyMsg/SignVerifyMsg';
import Rewards from 'components/Rewards';
import NotFound from 'components/App/NotFound';
import OnBoarding from 'components/OnBoarding';
import Nfts from 'components/Nfts';
import Agora from 'components/Agora';
import { LoadingCtn } from 'components/Common/Atoms';
import Cashtab from 'assets/cashtab_xec.png';
import './App.css';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
// Easter egg imports not used in extension/src/components/App.js
import TabCash from 'assets/tabcash.png';
import { CashtabWallet, hasEnoughToken } from 'wallet';
import ServiceWorkerWrapper from 'components/Common/ServiceWorkerWrapper';
import WebApp from 'components/AppModes/WebApp';
import Extension from 'components/AppModes/Extension';
import ExtensionHeader from 'components/Common/ExtensionHeader';
import WalletLabel from 'components/Common/WalletLabel.js';
import BalanceHeader from 'components/Common/BalanceHeader';
import { isValidCashtabWallet } from 'validation';
import { Bounce, ToastContainer } from 'react-toastify';
import {
    ExtensionFrame,
    GlobalStyle,
    CustomApp,
    Footer,
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
    BalanceHeaderContainer,
    DesktopLogo,
    HeaderInfoCtn,
} from 'components/App/styles';
import appConfig from 'config/app';

const App = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const {
        cashtabState,
        updateCashtabState,
        fiatPrice,
        loading,
        cashtabLoaded,
    } = ContextValue;
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const [navMenuClicked, setNavMenuClicked] = useState(false);
    const handleNavMenuClick = () => setNavMenuClicked(!navMenuClicked);
    // If wallet is unmigrated, do not show page until it has migrated
    // An invalid wallet will be validated/populated after the next API call, ETA 10s
    const validWallet = isValidCashtabWallet(wallet);
    const location = useLocation();
    const navigate = useNavigate();

    /**
     * Note the use Number here is acceptable for XECX because
     * the supply is less than XEC supply, and hence less than
     * Number.MAX_SAFE_INTEGER
     */
    const balanceXecx =
        wallet !== false
            ? Number(
                  wallet.state.tokens.get(appConfig.vipTokens.xecx.tokenId),
              ) || 0
            : 0;

    // Easter egg boolean not used in extension/src/components/App.js
    const hasTab = validWallet
        ? hasEnoughToken(
              (wallet as CashtabWallet).state.tokens,
              '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
              '1',
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

            {loading || (wallet !== false && !validWallet && <Spinner />)}
            <CustomApp>
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark"
                    transition={Bounce}
                />
                <WalletBody>
                    <WalletCtn showFooter={wallet !== false}>
                        {!cashtabLoaded ? (
                            <LoadingCtn title="Cashtab Loading" />
                        ) : (
                            <>
                                {wallet === false ? (
                                    <OnBoarding />
                                ) : (
                                    <>
                                        <HeaderCtn>
                                            {process.env.REACT_APP_BUILD_ENV ===
                                            'extension' ? (
                                                <ExtensionHeader
                                                    path={location.pathname}
                                                />
                                            ) : (
                                                <CashtabLogo
                                                    src={Cashtab}
                                                    alt="cashtab"
                                                />
                                            )}
                                        </HeaderCtn>
                                        <HeaderInfoCtn>
                                            <WalletLabel
                                                wallets={wallets}
                                                settings={settings}
                                                updateCashtabState={
                                                    updateCashtabState
                                                }
                                                userLocale={navigator.language}
                                            ></WalletLabel>
                                            <BalanceHeaderContainer title="Wallet Info">
                                                <BalanceHeader
                                                    balanceSats={
                                                        (
                                                            wallet as CashtabWallet
                                                        ).state.balanceSats
                                                    }
                                                    balanceXecx={balanceXecx}
                                                    settings={settings}
                                                    fiatPrice={fiatPrice}
                                                    userLocale={
                                                        navigator.language
                                                    }
                                                />
                                            </BalanceHeaderContainer>
                                        </HeaderInfoCtn>
                                        <ScreenWrapper>
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
                                                    path="/create-nft-collection"
                                                    element={<CreateToken />}
                                                />

                                                <Route
                                                    path="/send"
                                                    element={<SendXec />}
                                                />
                                                <Route path="/send-token">
                                                    <Route
                                                        path=":tokenId"
                                                        element={<Token />}
                                                    />
                                                </Route>
                                                <Route path="/token">
                                                    <Route
                                                        index
                                                        element={<Etokens />}
                                                    />
                                                    <Route
                                                        path=":tokenId"
                                                        element={<Token />}
                                                    />
                                                </Route>
                                                <Route
                                                    path="/airdrop"
                                                    element={<Airdrop />}
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
                                                    path="/nfts"
                                                    element={<Nfts />}
                                                />
                                                <Route
                                                    path="/agora"
                                                    element={<Agora />}
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
                                                <Route
                                                    path="/configure"
                                                    element={<Configure />}
                                                />
                                                {process.env
                                                    .REACT_APP_BUILD_ENV !==
                                                    'extension' &&
                                                    process.env
                                                        .REACT_APP_TESTNET !==
                                                        'true' && (
                                                        <>
                                                            <Route
                                                                path="/rewards"
                                                                element={
                                                                    <Rewards />
                                                                }
                                                            />
                                                        </>
                                                    )}
                                                <Route
                                                    path="/"
                                                    element={<Home />}
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
                            <DesktopLogo>
                                <CashtabLogo src={Cashtab} alt="cashtab" />
                            </DesktopLogo>
                            <NavButton
                                active={
                                    location.pathname === '/' ||
                                    location.pathname === '/wallet'
                                }
                                onClick={() => navigate('/')}
                            >
                                <span>Transactions</span>
                                <HomeIcon />
                            </NavButton>

                            <NavButton
                                aria-label="Send Screen"
                                active={location.pathname === '/send'}
                                onClick={() => navigate('/send')}
                            >
                                <span>Send</span>
                                <SendIcon />
                            </NavButton>
                            <NavButton
                                aria-label="Tokens"
                                active={location.pathname === '/etokens'}
                                onClick={() => navigate('/etokens')}
                            >
                                <span>Tokens</span>
                                <TokensIcon />
                            </NavButton>
                            <NavButton
                                aria-label="Receive"
                                active={location.pathname === '/receive'}
                                onClick={() => navigate('receive')}
                            >
                                <span>Receive</span>
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
                                        active={location.pathname === '/backup'}
                                        onClick={() => navigate('/backup')}
                                    >
                                        {' '}
                                        <p>Wallet Backup</p>
                                        <WalletIcon />
                                    </NavItem>
                                    <NavItem
                                        active={
                                            location.pathname === '/wallets'
                                        }
                                        onClick={() => navigate('/wallets')}
                                    >
                                        {' '}
                                        <p>Wallets</p>
                                        <BankIcon />
                                    </NavItem>
                                    <NavItem
                                        active={location.pathname === '/nfts'}
                                        onClick={() => navigate('/nfts')}
                                    >
                                        {' '}
                                        <p>Listed NFTs</p>
                                        <NftIcon />
                                    </NavItem>
                                    <NavItem
                                        active={location.pathname === '/agora'}
                                        onClick={() => navigate('/agora')}
                                    >
                                        {' '}
                                        <p>Agora</p>
                                        <DogeIcon />
                                    </NavItem>
                                    <NavItem
                                        active={
                                            location.pathname === '/contacts'
                                        }
                                        onClick={() => navigate('/contacts')}
                                    >
                                        {' '}
                                        <p>Contacts</p>
                                        <ContactsIcon />
                                    </NavItem>
                                    <NavItem
                                        active={
                                            location.pathname === '/airdrop'
                                        }
                                        onClick={() => navigate('/airdrop')}
                                    >
                                        {' '}
                                        <p>Airdrop</p>
                                        <AirdropIcon />
                                    </NavItem>
                                    {process.env.REACT_APP_BUILD_ENV !==
                                        'extension' &&
                                        process.env.REACT_APP_TESTNET !==
                                            'true' && (
                                            <>
                                                <NavItem
                                                    active={
                                                        location.pathname ===
                                                        '/rewards'
                                                    }
                                                    onClick={() =>
                                                        navigate('/rewards')
                                                    }
                                                >
                                                    {' '}
                                                    <p>Rewards</p>
                                                    <RewardIcon />
                                                </NavItem>
                                            </>
                                        )}
                                    <NavItem
                                        active={
                                            location.pathname ===
                                            '/signverifymsg'
                                        }
                                        onClick={() =>
                                            navigate('/signverifymsg')
                                        }
                                    >
                                        <p>Sign & Verify</p>
                                        <ThemedSignAndVerifyMsg />
                                    </NavItem>
                                    <NavItem
                                        active={
                                            location.pathname === '/configure'
                                        }
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
                <Tooltip
                    id="cashtab-tooltip"
                    place="bottom-end"
                    opacity={1}
                    style={{ zIndex: 1000 }}
                />
            </CustomApp>
        </ThemeProvider>
    );
};

export default App;
