import React from 'react';
import 'antd/dist/antd.less';
import '../index.css';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { theme } from '@assets/styles/theme';
import {
    FolderOpenFilled,
    CaretRightOutlined,
    SettingFilled,
    AppstoreAddOutlined,
} from '@ant-design/icons';
import Wallet from '@components/Wallet/Wallet';
import Tokens from '@components/Tokens/Tokens';
import Send from '@components/Send/Send';
import SendToken from '@components/Send/SendToken';
import Configure from '@components/Configure/Configure';
import NotFound from '@components/NotFound';
import CashTab from '@assets/cashtab_xec.png';
import PopOut from '@assets/popout.svg';
import './App.css';
import { WalletContext } from '@utils/context';
import WalletLabel from '@components/Common/WalletLabel.js';
import {
    Route,
    Redirect,
    Switch,
    useLocation,
    useHistory,
} from 'react-router-dom';

import fbt from 'fbt';

const GlobalStyle = createGlobalStyle`    
    .ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button, .ant-modal > button, .ant-modal-confirm-btns > button, .ant-modal-footer > button {
        border-radius: 8px;
        background-color: ${props => props.theme.modals.buttons.background};
        color: ${props => props.theme.wallet.text.secondary};
        font-weight: bold;
    }    
    
    .ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button:hover,.ant-modal-confirm-btns > button:hover, .ant-modal-footer > button:hover {
        color: ${props => props.theme.primary};
        transition: color 0.3s;
        background-color: ${props => props.theme.modals.buttons.background};
    }   
    .selectedCurrencyOption {
        text-align: left;
        color: ${props => props.theme.wallet.text.secondary} !important;
        background-color: ${props => props.theme.contrast} !important;
    }
    .cashLoadingIcon {
        color: ${props => props.theme.primary} !important
        font-size: 48px !important;
    }
    .selectedCurrencyOption:hover {
        color: ${props => props.theme.contrast} !important;
        background-color: ${props => props.theme.primary} !important;
    }
    #addrSwitch {
        .ant-switch-checked {
            background-color: white !important;
        }
    }
    #addrSwitch.ant-switch-checked {
        background-image: ${props =>
            props.theme.buttons.primary.backgroundImage} !important;
    }
`;

const CustomApp = styled.div`
    text-align: center;
    font-family: 'Gilroy', sans-serif;
    background-color: ${props => props.theme.app.background};
`;

const Footer = styled.div`
    z-index: 2;
    background-color: ${props => props.theme.footer.background};
    border-radius: 20px;
    position: fixed;
    bottom: 0;
    width: 500px;
    @media (max-width: 768px) {
        width: 100%;
    }
    border-top: 1px solid ${props => props.theme.wallet.borders.color};
`;

const OpenInTabBtn = styled.button`
    background: none;
    border: none;
`;
const ExtTabImg = styled.img`
    max-width: 20px;
`;
export const NavButton = styled.button`
    :focus,
    :active {
        outline: none;
    }
    cursor: pointer;
    padding: 24px 12px 12px 12px;
    margin: 0 28px;
    @media (max-width: 475px) {
        margin: 0 20px;
    }
    @media (max-width: 420px) {
        margin: 0 12px;
    }
    @media (max-width: 350px) {
        margin: 0 8px;
    }
    background-color: ${props => props.theme.footer.background};
    border: none;
    font-size: 12px;
    font-weight: bold;
    .anticon {
        display: block;
        color: ${props => props.theme.footer.navIconInactive};
        font-size: 24px;
        margin-bottom: 6px;
    }
    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.primary};
        .anticon {
            color: ${props.theme.primary};
        }
  `}
`;

export const WalletBody = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    background: ${props => props.theme.app.sidebars};
`;
export const WalletCtn = styled.div`
    position: relative;
    width: 500px;
    background-color: ${props => props.theme.footerBackground};
    min-height: 100vh;
    padding: 10px 30px 120px 30px;
    background: ${props => props.theme.wallet.background};
    -webkit-box-shadow: 0px 0px 24px 1px ${props => props.theme.wallet.shadow};
    -moz-box-shadow: 0px 0px 24px 1px ${props => props.theme.wallet.shadow};
    box-shadow: 0px 0px 24px 1px ${props => props.theme.wallet.shadow};
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
    justify-content: center;
    width: 100%;
    padding: 20px 0 30px;
    margin-bottom: 20px;
    justify-content: space-between;
    border-bottom: 1px solid ${props => props.theme.wallet.borders.color};

    a {
        color: ${props => props.theme.wallet.text.secondary};

        :hover {
            color: ${props => props.theme.primary};
        }
    }

    @media (max-width: 768px) {
        a {
            font-size: 12px;
        }
        padding: 10px 0 20px;
    }
`;

export const CashTabLogo = styled.img`
    width: 120px;
    @media (max-width: 768px) {
        width: 110px;
    }
`;
export const AbcLogo = styled.img`
    width: 150px;
    @media (max-width: 768px) {
        width: 120px;
    }
`;

const App = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet } = ContextValue;
    const location = useLocation();
    const history = useHistory();
    const selectedKey =
        location && location.pathname ? location.pathname.substr(1) : '';
    const openInTab = () => {
        window.open(`index.html#/${selectedKey}`);
    };

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <CustomApp>
                <WalletBody>
                    <WalletCtn>
                        <HeaderCtn>
                            <CashTabLogo src={CashTab} alt="cashtab" />
                            <OpenInTabBtn
                                data-tip="Open in tab"
                                onClick={() => openInTab()}
                            >
                                <ExtTabImg src={PopOut} alt="Open in tab" />
                            </OpenInTabBtn>
                        </HeaderCtn>
                        <WalletLabel name={wallet.name}></WalletLabel>
                        <Switch>
                            <Route path="/wallet">
                                <Wallet />
                            </Route>
                            <Route path="/tokens">
                                <Tokens />
                            </Route>
                            <Route path="/send">
                                <Send />
                            </Route>
                            <Route
                                path="/send-token/:tokenId"
                                render={props => (
                                    <SendToken
                                        tokenId={props.match.params.tokenId}
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
                                <FolderOpenFilled />
                                <fbt desc="Wallet menu button">Wallet</fbt>
                            </NavButton>

                            <NavButton
                                active={selectedKey === 'tokens'}
                                onClick={() => history.push('/tokens')}
                            >
                                <AppstoreAddOutlined />
                                Tokens
                            </NavButton>

                            <NavButton
                                active={selectedKey === 'send'}
                                onClick={() => history.push('/send')}
                            >
                                <CaretRightOutlined />
                                <fbt desc="Send menu button">Send</fbt>
                            </NavButton>
                            <NavButton
                                active={selectedKey === 'configure'}
                                onClick={() => history.push('/configure')}
                            >
                                <SettingFilled />
                                <fbt desc="Settings menu button">Settings</fbt>
                            </NavButton>
                        </Footer>
                    ) : null}
                </WalletBody>
            </CustomApp>
        </ThemeProvider>
    );
};

export default App;
