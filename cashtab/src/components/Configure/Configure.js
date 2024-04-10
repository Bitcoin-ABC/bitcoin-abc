// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { WalletContext } from 'wallet/context';
import {
    DollarIcon,
    SettingsIcon,
    ThemedXIcon,
    ThemedFacebookIcon,
    SocialContainer,
    SocialLink,
    GithubIcon,
} from 'components/Common/CustomIcons';
import TokenIcon from 'components/Etokens/TokenIcon';
import { getWalletState } from 'utils/cashMethods';
import appConfig from 'config/app';
import { isMobile } from 'helpers';
import { hasEnoughToken } from 'wallet';
import { CurrencySelect } from 'components/Common/Inputs';
import Switch from 'components/Common/Switch';
import { Info } from 'components/Common/Atoms';

const VersionContainer = styled.div`
    color: ${props => props.theme.contrast};
`;

const ConfigIconWrapper = styled.div`
    svg {
        height: 42px;
        width: 42px;
        fill: ${props => props.theme.eCashBlue};
    }
`;
const StyledConfigure = styled.div`
    margin: 12px 0;
`;

const HeadlineAndIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 12px 0;
`;
const Headline = styled.div`
    font-size: 20px;
    color: ${props => props.theme.contrast};
    font-weight: bold;
`;

const StyledSpacer = styled.div`
    height: 1px;
    width: 100%;
    background-color: ${props => props.theme.lightWhite};
    margin: 60px 0 50px;
`;

const SettingsLabel = styled.div`
    text-align: left;
    display: flex;
    gap: 9px;
    color: ${props => props.theme.contrast};
`;

const Switches = styled.div`
    flex-direction: column;
    display: flex;
    gap: 12px;
`;
const GeneralSettingsItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    color: ${props => props.theme.lightWhite};
`;

const NoticeHolder = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Configure = () => {
    const ContextValue = React.useContext(WalletContext);
    const { updateCashtabState, cashtabState } = ContextValue;
    const { settings, wallets } = cashtabState;

    const wallet = wallets.length > 0 ? wallets[0] : false;

    // TODO deprecate getWalletState function
    const walletState = getWalletState(wallet);

    const { tokens } = walletState;

    const handleSendModalToggle = e => {
        updateCashtabState('settings', {
            ...settings,
            sendModal: e.target.checked,
        });
    };

    const handleMinFeesToggle = e => {
        updateCashtabState('settings', {
            ...settings,
            minFeeSends: e.target.checked,
        });
    };

    const handleCameraOverride = e => {
        updateCashtabState('settings', {
            ...settings,
            autoCameraOn: e.target.checked,
        });
    };

    return (
        <StyledConfigure data-testid="configure-ctn">
            <NoticeHolder>
                <Info>
                    ℹ️ Backup wallet has moved
                    <br />
                    <br /> Go to the <Link to="/backup">
                        Backup Wallet
                    </Link>{' '}
                    screen to see your seed phrase
                </Info>
                <Info>
                    ℹ️ Contacts have moved to the{' '}
                    <Link to="/contacts">Contacts</Link> screen
                </Info>
                <Info>
                    ℹ️ Wallets have moved to the{' '}
                    <Link to="/wallets">Wallets</Link> screen
                </Info>
            </NoticeHolder>
            <HeadlineAndIcon>
                <ConfigIconWrapper>
                    <DollarIcon />
                </ConfigIconWrapper>{' '}
                <Headline>Fiat Currency</Headline>
            </HeadlineAndIcon>
            <CurrencySelect
                name="configure-fiat-select"
                value={cashtabState.settings.fiatCurrency}
                handleSelect={e => {
                    updateCashtabState('settings', {
                        ...settings,
                        fiatCurrency: e.target.value,
                    });
                }}
            />
            <StyledSpacer />
            <HeadlineAndIcon>
                <ConfigIconWrapper>
                    <SettingsIcon />
                </ConfigIconWrapper>{' '}
                <Headline>General Settings</Headline>
            </HeadlineAndIcon>
            <Switches>
                <GeneralSettingsItem>
                    <Switch
                        name="send-confirmations-switch"
                        checked={settings.sendModal}
                        handleToggle={handleSendModalToggle}
                    />
                    <SettingsLabel>Send Confirmations</SettingsLabel>
                </GeneralSettingsItem>
                {isMobile(navigator) && (
                    <GeneralSettingsItem>
                        <Switch
                            name="settings-camera-auto-open"
                            checked={settings.autoCameraOn}
                            handleToggle={handleCameraOverride}
                        />
                        <SettingsLabel>Auto-open camera on send</SettingsLabel>
                    </GeneralSettingsItem>
                )}
            </Switches>

            {hasEnoughToken(
                tokens,
                appConfig.vipSettingsTokenId,
                appConfig.vipSettingsTokenQty,
            ) && (
                <>
                    <StyledSpacer />
                    <HeadlineAndIcon>
                        {' '}
                        <TokenIcon
                            size={64}
                            tokenId={appConfig.vipSettingsTokenId}
                        />
                        <Headline>VIP Settings</Headline>
                    </HeadlineAndIcon>
                    <GeneralSettingsItem>
                        <Switch
                            name="settings-minFeeSends-switch"
                            checked={settings.minFeeSends}
                            handleToggle={handleMinFeesToggle}
                        />
                        <SettingsLabel> ABSOLUTE MINIMUM fees</SettingsLabel>
                    </GeneralSettingsItem>
                </>
            )}

            <StyledSpacer />
            <SocialContainer>
                <SocialLink
                    href="https://x.com/cashtabwallet"
                    target="_blank"
                    rel="noreferrer"
                >
                    <ThemedXIcon />
                </SocialLink>{' '}
                <SocialLink
                    href="https://www.facebook.com/Cashtab"
                    target="_blank"
                    rel="noreferrer"
                >
                    <ThemedFacebookIcon />
                </SocialLink>
                <SocialLink
                    href="https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/cashtab"
                    target="_blank"
                    rel="noreferrer"
                >
                    <GithubIcon />
                </SocialLink>
            </SocialContainer>

            {typeof process.env.REACT_APP_VERSION === 'string' && (
                <>
                    <StyledSpacer />
                    <VersionContainer>
                        v{process.env.REACT_APP_VERSION}
                    </VersionContainer>
                </>
            )}
        </StyledConfigure>
    );
};

export default Configure;
