import React from 'react';
import 'antd/dist/antd.less';
import '../index.css';
import styled from 'styled-components';
import { Layout, Tabs, Icon } from 'antd';
import Wallet from './Wallet/Wallet';
import Send from './Send/Send';
import SendToken from './Send/SendToken';
import Configure from './Configure/Configure';
import NotFound from './NotFound';
import CashTab from '../assets/cashtab.png';
import ABC from '../assets/bitcoinabclogo.png';
import './App.css';
import { WalletContext } from '../utils/context';
import {
    Route,
    Redirect,
    Switch,
    useLocation,
    useHistory,
} from 'react-router-dom';

import fbt from 'fbt';
const { Footer } = Layout;
const { TabPane } = Tabs;

const StyledTabsMenu = styled.div`
    .ant-layout-footer {
        position: absolute;
        bottom: 0;
        width: 100%;
        padding: 0;
        background-color: #fff;
        left: 0;
        border-radius: 20px;
        border-top: 1px solid #e2e2e2;
        @media (max-width: 768px) {
            position: fixed;
        }
    }
    .ant-tabs-nav .ant-tabs-tab {
        padding: 30px 0 20px 0;
    }
    .ant-tabs-bar.ant-tabs-bottom-bar {
        margin-top: 0;
        border-top: none;
    }
    .ant-tabs-tab {
        span {
            font-size: 12px;
            display: grid;
            font-weight: bold;
        }
        .anticon {
            color: rgb(148, 148, 148);
            font-size: 24px;
            margin-left: 8px;
            margin-bottom: 3px;
        }
    }
    .ant-tabs-tab:hover {
        color: #ff8d00 !important;
        .anticon {
            color: #ff8d00;
        }
    }
    .ant-tabs-tab-active.ant-tabs-tab {
        color: #ff8d00;
        .anticon {
            color: #ff8d00;
        }
    }
    .ant-tabs-tab-active.ant-tabs-tab {
        color: #ff8d00;
        .anticon {
            color: #ff8d00;
        }
    }
    .ant-tabs-tab-active:active {
        color: #ff8d00 !important;
    }
    .ant-tabs-ink-bar {
        display: none !important;
    }
    .ant-tabs-nav {
        margin: -3.5px 0 0 0;
    }
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
    padding-top: 30px;
    padding: 10px 30px 100px 30px;
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

    return (
        <div className="App">
            <WalletBody>
                <WalletCtn>
                    <HeaderCtn>
                        <CashTabLogo src={CashTab} alt="cashtab" />
                        <a
                            href="https://www.bitcoinabc.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <AbcLogo src={ABC} alt="abc" />
                        </a>
                    </HeaderCtn>
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

                    {wallet ? (
                        <StyledTabsMenu>
                            <Footer>
                                <Tabs
                                    activeKey={selectedKey}
                                    tabBarGutter={80}
                                    tabPosition="bottom"
                                >
                                    <TabPane
                                        tab={
                                            <span
                                                onClick={() =>
                                                    history.push('/wallet')
                                                }
                                            >
                                                <Icon
                                                    type="folder-open"
                                                    theme="filled"
                                                />
                                                <fbt desc="Wallet menu button">
                                                    Wallet
                                                </fbt>
                                            </span>
                                        }
                                        key="wallet"
                                    />
                                    <TabPane
                                        tab={
                                            <span
                                                onClick={() =>
                                                    history.push('/send')
                                                }
                                            >
                                                <Icon
                                                    type="caret-right"
                                                    theme="filled"
                                                />
                                                <fbt desc="Send menu button">
                                                    Send
                                                </fbt>
                                            </span>
                                        }
                                        key="send"
                                        disabled={!wallet}
                                    />
                                    <TabPane
                                        tab={
                                            <span
                                                onClick={() =>
                                                    history.push('/configure')
                                                }
                                            >
                                                <Icon
                                                    type="setting"
                                                    theme="filled"
                                                />
                                                <fbt desc="Settings menu button">
                                                    Settings
                                                </fbt>
                                            </span>
                                        }
                                        key="configure"
                                        disabled={!wallet}
                                    />
                                </Tabs>
                            </Footer>
                        </StyledTabsMenu>
                    ) : null}
                </WalletCtn>
            </WalletBody>
        </div>
    );
};

export default App;
