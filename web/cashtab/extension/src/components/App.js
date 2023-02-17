import React, { useState, useEffect } from 'react';
import 'antd/dist/antd.less';
import PropTypes from 'prop-types';
import { Spin, Modal } from 'antd';
import {
    CashLoadingIcon,
    HomeIcon,
    SendIcon,
    ReceiveIcon,
    SettingsIcon,
    AirdropIcon,
    ThemedSignAndVerifyMsg,
    ThemedUserProfileIcon,
} from 'components/Common/CustomIcons';
import '../index.css';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { theme } from 'assets/styles/theme';
import Home from 'components/Home/Home';
import Receive from 'components/Receive/Receive';
import Tokens from 'components/Tokens/Tokens';
import Send from 'components/Send/Send';
import SendToken from 'components/Send/SendToken';
import Airdrop from 'components/Airdrop/Airdrop';
import Alias from 'components/Alias/Alias';
import Configure from 'components/Configure/Configure';
import SignVerifyMsg from 'components/SignVerifyMsg/SignVerifyMsg';
import NotFound from 'components/NotFound';
import Cashtab from 'assets/cashtab_xec.png';
import './App.css';
import { WalletContext } from 'utils/context';
import { isValidStoredWallet, convertToEcashPrefix } from 'utils/cashMethods';
import {
    Route,
    Redirect,
    Switch,
    useLocation,
    useHistory,
} from 'react-router-dom';
// Extension-only import used for open in new tab link
import PopOut from 'assets/popout.svg';
// Extension-only import used for interacting with the extension API
import extension from 'extensionizer';
import { currency } from 'components/Common/Ticker.js';

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

const NavWrapper = styled.div`
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 1.3rem;
    margin-bottom: 5px;
`;

const NavIcon = styled.span`
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
    margin-right: 1px;
    bottom: 5rem;
    display: flex;
    width: 8.23rem;
    flex-direction: column;
    border: ${props => (props.open ? '0.1px solid' : '0px solid')};
    border-color: ${props =>
        props.open ? props.theme.contrast : 'transparent'};
    justify-content: center;
    align-items: center;
    overflow: hidden;
    @media (max-width: 768px) {
        right: 0;
        margin-right: 0;
    }
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
        color: ${props => props.theme.navActive};
        svg {
            fill: ${props => props.theme.navActive};
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
        margin-top: 5px;
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
    justify-content: space-between;
    width: 100%;
    padding: 15px;
`;

export const CashtabLogo = styled.img`
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

const LogoCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    width: 100%;
    div {
        flex-grow: 3;
    }
    ${CashtabLogo} {
        flex: 2;
        text-align: center;
    }
    ${OpenInTabBtn} {
        flex: 3;
        text-align: right;
    }
`;

const ExtTabImg = styled.img`
    max-width: 20px;
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
    const [showApproveAddressShareModal, setShowApproveAddressShareModal] =
        useState(false);
    const [addressRequestTabId, setAddressRequestTabId] = useState(null);
    const [addressRequestTabUrl, setAddressRequestTabUrl] = useState('');
    const handleNavMenuClick = () => setNavMenuClicked(!navMenuClicked);
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
    // Connect to extension messaging port
    const port = extension.runtime.connect({ name: 'cashtabPort' });
    // Extension storage get method
    const getObjectFromExtensionStorage = async function (key) {
        return new Promise((resolve, reject) => {
            try {
                extension.storage.sync.get(key, function (value) {
                    resolve(value[key]);
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    const copyAddressToExtensionStorage = async wallet => {
        // Get address from active wallet
        let address;
        try {
            address = wallet.Path1899.cashAddress;
            address = convertToEcashPrefix(address);
            console.log(`Address fetched from extension`, address);
        } catch (err) {
            // The wallet object can be 'false' when Cashtab first loads. In this case, we want this function to do nothing.
            return console.log(
                `Wallet not loaded yet, exiting copyAddressToExtension`,
            );
        }
        // Save the address to extension storage API

        // Check for stored value
        const storedAddress = await getObjectFromExtensionStorage(['address']);
        console.log(`storedAddress`, storedAddress);
        if (address === storedAddress) {
            // No need to store it again
            console.log(`Active wallet address already in extension storage`);
            return;
        }

        // If the address has not been set (or if the user has changed wallets since it was last set), set it
        await extension.storage.sync.set({ address: address }, function () {
            console.log(
                `Address ${address} saved to storage under key 'address'`,
            );
        });
    };

    const handleApprovedAddressShare = () => {
        console.log(`handleApprovedAddressShare called`);
        // Let the background script know you approved this request
        port.postMessage({
            type: 'FROM_CASHTAB',
            text: 'Cashtab',
            addressRequestApproved: true,
            url: addressRequestTabUrl,
            tabId: addressRequestTabId,
        });
        setShowApproveAddressShareModal(false);
        // Close the popup after user action
        window.close();
    };

    const handleRejectedAddressShare = () => {
        console.log(`handleRejectedAddressShare called`);
        // Let the background script know you denied this request
        port.postMessage({
            type: 'FROM_CASHTAB',
            text: 'Cashtab',
            addressRequestApproved: false,
            url: addressRequestTabUrl,
            tabId: addressRequestTabId,
        });
        setShowApproveAddressShareModal(false);
        // Close the popup after user action
        window.close();
    };

    const checkForPersistentStorage = async () => {
        // Request persistent storage for site
        if (navigator.storage && navigator.storage.persist) {
            // Check if storage is persistent
            const isPersisted = await navigator.storage.persisted();
            console.log(`Persisted storage status: ${isPersisted}`);
            // If not, request persistent storage
            if (!isPersisted) {
                console.log(`Requesting persistent storage`);
                const persistanceRequestResult =
                    await navigator.storage.persist();
                console.log(
                    `Persistent storage granted: ${persistanceRequestResult}`,
                );
            }
        }
    };

    useEffect(() => {
        copyAddressToExtensionStorage(wallet);
    }, [wallet]);

    useEffect(() => {
        // On load useEffect() block

        // Check for peristent storage
        checkForPersistentStorage();
        // Parse for query string asking for user approval of sharing extension info with a web page
        // Do not set txInfo in state if query strings are not present
        if (
            !window.location ||
            !window.location.hash ||
            window.location.hash === '#/wallet'
        ) {
            return;
        }

        try {
            let windowHash = window.location.hash;
            let queryStringArray = windowHash.split('#/wallet?');
            let queryString = queryStringArray[1];
            let queryStringParams = new URLSearchParams(queryString);
            let request = queryStringParams.get('request');
            let tabId = queryStringParams.get('tabId');
            let tabUrl = queryStringParams.get('tabUrl');
            console.log(`request`, request);
            console.log(`tabId`, tabId);
            console.log(`tabUrl`, tabUrl);
            if (request !== 'addressRequest') {
                return;
            }

            // Open a modal that asks for user approval
            setAddressRequestTabId(tabId);
            setAddressRequestTabUrl(tabUrl);
            setShowApproveAddressShareModal(true);
        } catch (err) {
            // If you can't parse this, forget about it
            return;
        }

        // Modal onApprove function should post a message that gets to background.js
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            {showApproveAddressShareModal && (
                <Modal
                    title={`Share your address?`}
                    open={showApproveAddressShareModal}
                    onOk={() => handleApprovedAddressShare()}
                    onCancel={() => handleRejectedAddressShare()}
                >
                    <p>
                        The web page {addressRequestTabUrl} is requesting your
                        eCash address.
                    </p>
                </Modal>
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
                                <LogoCtn>
                                    <div></div>
                                    <CashtabLogo src={Cashtab} alt="cashtab" />
                                    {/*Begin extension-only components*/}
                                    <OpenInTabBtn
                                        data-tip="Open in tab"
                                        onClick={() => openInTab()}
                                    >
                                        <ExtTabImg
                                            src={PopOut}
                                            alt="Open in tab"
                                        />
                                    </OpenInTabBtn>
                                    {/*End extension-only components*/}
                                </LogoCtn>
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
                                <Route path="/airdrop">
                                    <Airdrop
                                        passLoadingStatus={
                                            setLoadingUtxosAfterSend
                                        }
                                    />
                                </Route>
                                <Route path="/signverifymsg">
                                    <SignVerifyMsg />
                                </Route>
                                {currency.aliasSettings.aliasEnabled && (
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
                                        {currency.aliasSettings
                                            .aliasEnabled && (
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
