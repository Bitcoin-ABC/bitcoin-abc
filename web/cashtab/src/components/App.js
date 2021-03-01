import React from 'react';
import 'antd/dist/antd.less';
import '../index.css';
import styled from 'styled-components';
import {
    FolderOpenFilled,
    CaretRightOutlined,
    SettingFilled,
} from '@ant-design/icons';
import Wallet from '@components/Wallet/Wallet';
import Send from '@components/Send/Send';
import SendToken from '@components/Send/SendToken';
import Configure from '@components/Configure/Configure';
import NotFound from '@components/NotFound';
import CashTab from '@assets/cashtab.png';
import TabCash from '@assets/tabcash.png';
import ABC from '@assets/bitcoinabclogo.png';
import './App.css';
import { WalletContext } from '@utils/context';
import { checkForTokenById } from '@utils/tokenMethods.js';
import WalletLabel from '@components/Common/WalletLabel.js';
import {
    Route,
    Redirect,
    Switch,
    useLocation,
    useHistory,
} from 'react-router-dom';

import fbt from 'fbt';

const CustomApp = styled.div`
    text-align: center;
    font-family: 'Gilroy', sans-serif;
    background-color: #fbfbfd;
`;
const Footer = styled.div`
    background-color: #fff;
    border-radius: 20px;
    position: fixed;
    bottom: 0;
    width: 500px;
    @media (max-width: 768px) {
        width: 100%;
    }
    border-top: 1px solid #e2e2e2;
`;

export const NavButton = styled.button`
    :focus,
    :active {
        outline: none;
    }
    cursor: pointer;
    padding: 24px 12px 12px 12px;
    margin: 0 28px;
    @media (max-width: 360px) {
        margin: 0 12px;
    }
    background-color: #fff;
    border: none;
    font-size: 12px;
    font-weight: bold;
    .anticon {
        display: block;
        color: rgb(148, 148, 148);
        font-size: 24px;
        margin-bottom: 6px;
    }
    ${({ active }) =>
        active &&
        `    
        color: #ff8d00;
        .anticon {
            color: #ff8d00;
        }
  `}
`;

export const WalletBody = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(270deg, #040c3c, #212c6e);
`;

export const WalletCtn = styled.div`
    position: relative;
    width: 500px;
    background-color: #fff;
    min-height: 100vh;
    padding: 10px 30px 120px 30px;
    background: #fff;
    -webkit-box-shadow: 0px 0px 24px 1px rgba(0, 0, 0, 1);
    -moz-box-shadow: 0px 0px 24px 1px rgba(0, 0, 0, 1);
    box-shadow: 0px 0px 24px 1px rgba(0, 0, 0, 1);
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
    border-bottom: 1px solid #e2e2e2;
    a {
        color: #848484;
        :hover {
            color: #ff8d00;
        }
    }
    @media (max-width: 768px) {
        a {
            font-size: 12px;
        }
        padding: 10px 0 20px;
    }
`;

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
    const { wallet, tokens } = ContextValue;

    const hasTab = checkForTokenById(
        tokens,
        '50d8292c6255cda7afc6c8566fed3cf42a2794e9619740fe8f4c95431271410e',
    );
    const location = useLocation();
    const history = useHistory();
    const selectedKey =
        location && location.pathname ? location.pathname.substr(1) : '';

    return (
        <CustomApp>
            <WalletBody>
                <WalletCtn>
                    <HeaderCtn>
                        <CashTabLogo src={CashTab} alt="cashtab" />
                        {hasTab && <EasterEgg src={TabCash} alt="tabcash" />}
                        <a
                            href="https://www.bitcoinabc.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <AbcLogo src={ABC} alt="abc" />
                        </a>
                    </HeaderCtn>
                    <WalletLabel name={wallet.name}></WalletLabel>
                    <Switch>
                        <Route path="/wallet">
                            <Wallet />
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
    );
};

export default App;
